import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getChatSessionByNodeId,
  createChatSession,
  getMessagesByChatSessionId,
  getCanvasNodeById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { convertToUIMessages } from "@/lib/utils";

/**
 * GET /api/canvas/chat-session?nodeId={nodeId}
 *
 * Finds or creates a chat session for the given canvas node
 * Returns: { sessionId: string, messages: ChatMessage[] }
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

    // 4. Find existing chat session or create new one
    let chatSession = await getChatSessionByNodeId({ nodeId });

    if (!chatSession) {
      // Create new chat session
      chatSession = await createChatSession({
        projectId: node.projectId,
        canvasNodeId: nodeId,
        userId: session.user.id,
      });
    }

    // 5. Load messages for this session
    const messagesFromDb = await getMessagesByChatSessionId({ id: chatSession.id });
    const uiMessages = convertToUIMessages(messagesFromDb);

    // 6. Return session info
    return NextResponse.json({
      sessionId: chatSession.id,
      messages: uiMessages,
    });
  } catch (error) {
    console.error("[Canvas Chat Session API] Error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
