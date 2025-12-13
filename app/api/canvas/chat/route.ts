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
import { canvasSystemPrompt, type CanvasPromptContext } from "@/lib/ai/prompts/canvas-prompt";
import { createNode } from "@/lib/ai/tools/canvas/create-node";
import { updateNode } from "@/lib/ai/tools/canvas/update-node";
import { deleteNode } from "@/lib/ai/tools/canvas/delete-node";
import {
  getCanvasNodeById,
  getMessagesByChatSessionId,
  saveMessages,
  getProjectById,
  getProjectFramework,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { convertToUIMessages, generateUUID } from "@/lib/utils";

export const maxDuration = 60;

// Request body schema
const canvasChatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(z.any()),
  }),
  nodeContext: z.object({
    nodeId: z.string().uuid(),
    projectId: z.string().uuid(),
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
    const { sessionId, message, nodeContext } = canvasChatRequestSchema.parse(json);

    // 3. Get node context
    const node = await getCanvasNodeById({ id: nodeContext.nodeId });
    if (!node) {
      return new Response(
        JSON.stringify({ error: "Canvas node not found" }),
        { status: 404 }
      );
    }

    // 4. Get project info
    const project = await getProjectById({ projectId: nodeContext.projectId });
    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404 }
      );
    }

    // 5. Get project framework (optional)
    const framework = await getProjectFramework(nodeContext.projectId);

    // 6. Load message history
    const messagesFromDb = await getMessagesByChatSessionId({ id: sessionId });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    // 7. Ensure Chat record exists (for backward compatibility with old ChatSessions)
    const { getChatById, saveChat } = await import("@/lib/db/queries");
    const existingChat = await getChatById({ id: sessionId });
    console.log("[Canvas Chat] Checking Chat record:", { sessionId, exists: !!existingChat });
    if (!existingChat) {
      console.log("[Canvas Chat] Creating Chat record for session:", sessionId);
      await saveChat({
        id: sessionId,
        userId: session.user.id,
        title: `Canvas: ${node.title}`,
        visibility: "private",
      });
      console.log("[Canvas Chat] Chat record created successfully");
    }

    // 8. Save user message
    await saveMessages({
      messages: [{
        chatId: sessionId,
        id: message.id,
        role: "user",
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
      }],
    });

    // 9. Build Canvas system prompt
    const promptContext: CanvasPromptContext = {
      node: {
        id: node.id,
        title: node.title,
        content: node.content,
        type: node.type,
        tags: node.tags || [],
      },
      project: {
        name: project.name,
        description: project.description || undefined,
      },
      framework: framework
        ? {
            name: framework.name,
            zones: framework.zones?.map((z) => ({
              name: z.name,
              description: z.description,
            })),
          }
        : undefined,
    };

    const systemPromptText = canvasSystemPrompt(promptContext);

    // 10. Create streaming response
    let finalMergedUsage: AppUsage | undefined;
    const modelCatalog = await getTokenlensCatalog();

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamText({
          model: myProvider.languageModel("chat-model"),
          system: systemPromptText,
          messages: convertToModelMessages(uiMessages),
          stopWhen: stepCountIs(5),
          experimental_transform: smoothStream({ chunking: "word" }),
          tools: {
            createNode: createNode({
              session,
              dataStream,
              context: nodeContext,
            }),
            updateNode: updateNode({
              session,
              dataStream,
              context: nodeContext,
            }),
            deleteNode: deleteNode({
              session,
              dataStream,
              context: nodeContext,
            }),
          },
          onFinish: async ({ usage }) => {
            const summary = getUsage({
              modelId: "chat-model",
              usage,
              providers: modelCatalog?.data?.providers,
            });
            finalMergedUsage = { ...usage, ...summary, modelId: "chat-model" } as AppUsage;
            dataStream.write({ type: "data-usage", data: finalMergedUsage });
          },
        });

        result.consumeStream();
        dataStream.merge(result.toUIMessageStream({ sendReasoning: false }));
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        // Save assistant messages
        await saveMessages({
          messages: messages.map((msg: ChatMessage) => ({
            id: msg.id,
            role: msg.role,
            parts: msg.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: sessionId,
          })),
        });
      },
    });

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    console.error("[Canvas Chat API] Error:", error);

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
