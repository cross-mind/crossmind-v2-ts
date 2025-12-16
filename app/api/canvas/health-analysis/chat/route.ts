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

export async function POST(request: Request) {
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

    console.log("[Health Analysis Chat] UI Messages count:", uiMessages.length);
    console.log("[Health Analysis Chat] Latest message:", JSON.stringify(message, null, 2));
    if (uiMessages.length > 1) {
      console.log("[Health Analysis Chat] Previous message:", JSON.stringify(uiMessages[uiMessages.length - 2], null, 2));
    }
    // Log all messages to see full conversation structure
    uiMessages.forEach((msg, idx) => {
      console.log(`[Health Analysis Chat] UI Message ${idx}:`, JSON.stringify(msg, null, 2));
    });

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
        console.log("[Health Analysis Chat] Starting streamText execution");

        // Filter out UI messages with incomplete tool calls
        const cleanUIMessages = uiMessages.filter((msg) => {
          if (msg.role === 'assistant' && Array.isArray(msg.parts)) {
            const hasIncompleteToolCall = msg.parts.some((part: any) =>
              part.type?.startsWith('tool-') && part.state === 'input-streaming'
            );
            if (hasIncompleteToolCall) {
              console.log("[Health Analysis Chat] Filtered out message with incomplete tool call:", msg.id);
              return false;
            }
          }
          return true;
        });

        console.log("[Health Analysis Chat] UI Messages:", uiMessages.length, "Clean:", cleanUIMessages.length);

        const modelMessages = convertToModelMessages(cleanUIMessages);

        // Filter out invalid tool messages (empty content)
        const validModelMessages = modelMessages.filter((msg) => {
          if (msg.role === 'tool') {
            const hasContent = Array.isArray(msg.content) && msg.content.length > 0;
            if (!hasContent) {
              console.log("[Health Analysis Chat] Filtered out invalid tool message with empty content");
              return false;
            }
          }
          return true;
        });

        console.log("[Health Analysis Chat] Model messages count:", modelMessages.length, "Valid:", validModelMessages.length);

        // Log each valid model message
        validModelMessages.forEach((msg, idx) => {
          console.log(`[Health Analysis Chat] Valid Model Message ${idx}:`, {
            role: msg.role,
            contentLength: Array.isArray(msg.content) ? msg.content.length : 'not-array'
          });
        });

        const result = streamText({
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
            console.log("[Health Analysis Chat] Stream finished");

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
        });

        console.log("[Health Analysis Chat] Consuming stream...");
        result.consumeStream();
        dataStream.merge(result.toUIMessageStream({ sendReasoning: true }));
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
