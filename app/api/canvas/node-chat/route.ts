import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getChatByNodeId,
  createChatForNode,
  getMessagesByChatId,
  getCanvasNodeById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { convertToUIMessages } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/canvas/node-chat?nodeId={nodeId}
 *
 * Finds or creates a chat for the given canvas node
 * Returns: { chatId: string, messages: ChatMessage[] }
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    // 2. Get nodeId from query params
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");

    if (!nodeId) {
      return NextResponse.json(
        { error: "nodeId parameter is required" },
        { status: 400 }
      );
    }

    // 3. Get the canvas node to extract projectId
    const node = await getCanvasNodeById({ id: nodeId });
    if (!node) {
      return NextResponse.json(
        { error: "Canvas node not found" },
        { status: 404 }
      );
    }

    // 4. Find existing chat or create new one
    let chat = await getChatByNodeId({ nodeId });

    if (!chat) {
      // Create new chat for this node
      chat = await createChatForNode({
        projectId: node.projectId,
        canvasNodeId: nodeId,
        userId: session.user.id,
      });
    }

    // 5. Load messages for this chat
    const messagesFromDb = await getMessagesByChatId({ id: chat.id });
    const uiMessages = convertToUIMessages(messagesFromDb);

    // 6. Return chat info
    return NextResponse.json({
      chatId: chat.id,
      messages: uiMessages,
    });
  } catch (error) {
    console.error("[Canvas Node Chat API] Error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
