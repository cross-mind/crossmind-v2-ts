import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import { trace, context } from "@opentelemetry/api";
import { langfuseSpanProcessor } from "@/instrumentation";
import { createResumableStreamContext, type ResumableStreamContext } from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/providers";
import {
  healthAnalysisSystemPrompt,
  type HealthAnalysisPromptContext,
} from "@/lib/ai/prompts/health-analysis-prompt";
import { viewFrameworkZones } from "@/lib/ai/tools/view-framework-zones";
import { viewNode } from "@/lib/ai/tools/view-node";
import { createSuggestion } from "@/lib/ai/tools/create-suggestion";
import { updateFrameworkHealth } from "@/lib/ai/tools/update-framework-health";
import {
  getMessagesByChatId,
  saveMessages,
  getProjectById,
  getProjectFrameworkWithZones,
  getChatById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";

export const maxDuration = 60;

// Request body schema
const healthChatRequestSchema = z.object({
  id: z.string().uuid(), // Chat ID from useChat hook
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(z.any()),
  }),
});

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn("TokenLens: catalog fetch failed, using default catalog", err);
      return;
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 },
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(" > Resumable streams are disabled due to missing REDIS_URL");
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

async function healthAnalysisChatHandler(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // 2. Parse and validate request
    const json = await request.json();
    const { id, message } = healthChatRequestSchema.parse(json);

    // 3. Get chat record
    const chat = await getChatById({ id });
    if (!chat) {
      return new Response(
        JSON.stringify({ error: "Chat not found" }),
        { status: 404 }
      );
    }

    // 4. Validate chat type
    if (chat.type !== "health-analysis") {
      return new Response(
        JSON.stringify({ error: "Invalid chat type. Expected health-analysis." }),
        { status: 400 }
      );
    }

    // 5. Get project info
    if (!chat.projectId) {
      return new Response(
        JSON.stringify({ error: "No project associated with this chat" }),
        { status: 400 }
      );
    }

    const project = await getProjectById({ projectId: chat.projectId });
    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404 }
      );
    }

    // 6. Get project framework
    if (!chat.projectFrameworkId) {
      return new Response(
        JSON.stringify({ error: "No framework associated with this chat" }),
        { status: 400 }
      );
    }

    const frameworkData = await getProjectFrameworkWithZones({
      projectFrameworkId: chat.projectFrameworkId,
    });

    if (!frameworkData) {
      return new Response(
        JSON.stringify({ error: "Framework not found" }),
        { status: 404 }
      );
    }

    // 7. Load message history
    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    // 8. Save user message
    await saveMessages({
      messages: [{
        chatId: id,
        id: message.id,
        role: "user",
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
      }],
    });

    // 9. Build health analysis system prompt
    const promptContext: HealthAnalysisPromptContext = {
      project: {
        name: project.name,
        description: project.description || undefined,
      },
      framework: {
        id: frameworkData.id,
        name: frameworkData.name,
        description: frameworkData.description,
      },
      // TODO: Load health dimensions from database
      healthDimensions: undefined,
    };

    const systemPromptText = healthAnalysisSystemPrompt(promptContext);

    // 10. Prepare tool context
    const toolContext = {
      projectId: chat.projectId,
      projectFrameworkId: chat.projectFrameworkId,
      chatId: id,
    };

    // 12. Create streaming response
    let finalMergedUsage: AppUsage | undefined;
    const modelCatalog = await getTokenlensCatalog();

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        // Create a named root span for the trace with Langfuse-specific attributes
        const tracer = trace.getTracer("langfuse-tracer");
        const rootSpan = tracer.startSpan("health-analysis-chat", {
          attributes: {
            // Standard Langfuse attributes
            "langfuse.trace.name": "health-analysis-chat",
            "langfuse.trace.userId": session.user.id,
            "langfuse.trace.sessionId": id,
            // AI SDK telemetry attribute
            "ai.telemetry.functionId": "health-analysis-chat",
            // Project/Framework metadata
            "langfuse.trace.metadata.projectId": chat.projectId || "unknown",
            "langfuse.trace.metadata.frameworkId": chat.projectFrameworkId || "unknown",
            "langfuse.trace.metadata.frameworkName": frameworkData.name,
          },
        });

        // Filter out UI messages with incomplete tool calls
        const cleanUIMessages = uiMessages.filter((msg) => {
          if (msg.role === 'assistant' && Array.isArray(msg.parts)) {
            const hasIncompleteToolCall = msg.parts.some((part: any) =>
              part.type?.startsWith('tool-') && part.state === 'input-streaming'
            );
            return !hasIncompleteToolCall;
          }
          return true;
        });

        const modelMessages = convertToModelMessages(cleanUIMessages);

        // Filter out invalid tool messages (empty content)
        const validModelMessages = modelMessages.filter((msg) => {
          if (msg.role === 'tool') {
            return Array.isArray(msg.content) && msg.content.length > 0;
          }
          return true;
        });

        // Run streamText in the context of the root span
        const result = context.with(trace.setSpan(context.active(), rootSpan), () => streamText({
          model: myProvider.languageModel("chat-model"),
          system: systemPromptText,
          messages: validModelMessages,
          // Allow autonomous multi-turn tool calling with higher step limit than regular chat
          stopWhen: stepCountIs(10),
          experimental_activeTools: [
            "viewFrameworkZones",
            "viewNode",
            "createSuggestion",
            "updateFrameworkHealth",
          ],
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_telemetry: {
            isEnabled: true,
            functionId: "health-analysis-chat",
            metadata: {
              userId: session.user.id,
              sessionId: id,
              projectId: chat.projectId || "unknown",
              projectFrameworkId: chat.projectFrameworkId || "unknown",
              frameworkName: frameworkData.name,
            },
          },
          tools: {
            viewFrameworkZones: viewFrameworkZones({
              session,
              context: toolContext,
            }),
            viewNode: viewNode({
              session,
            }),
            createSuggestion: createSuggestion({
              session,
              dataStream,
              context: toolContext,
            }),
            updateFrameworkHealth: updateFrameworkHealth({
              session,
              dataStream,
              context: toolContext,
            }),
          },
          onFinish: async ({ usage }) => {
            if (!modelCatalog) {
              finalMergedUsage = usage;
              dataStream.write({ type: "data-usage", data: finalMergedUsage });
              return;
            }
            const summary = getUsage({
              modelId: "chat-model",
              usage,
              providers: modelCatalog,
            });
            finalMergedUsage = { ...usage, ...summary, modelId: "chat-model" } as AppUsage;
            dataStream.write({ type: "data-usage", data: finalMergedUsage });
          },
        }));

        result.consumeStream();
        dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));

        // End root span after streaming completes
        setTimeout(() => rootSpan.end(), 100);
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Save assistant messages
        await saveMessages({
          messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: msg.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
    });

    // Force flush traces before serverless function terminates
    after(async () => {
      await langfuseSpanProcessor.forceFlush();
      console.log("[Langfuse] Flushed traces for health-analysis-chat");
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    console.error("[Health Analysis Chat API] Error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request format", details: error.errors }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}

// Export POST handler - telemetry handled via experimental_telemetry in streamText
export const POST = healthAnalysisChatHandler;
