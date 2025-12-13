import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  createCanvasComment,
  getCanvasComments,
  getCanvasNodeById,
} from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// GET /api/canvas/[id]/comments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { id } = await params;

  try {
    // Check if node exists and user has access
    const node = await getCanvasNodeById({ id });
    if (!node) {
      return new ChatSDKError("not_found:api", "Canvas node not found").toResponse();
    }

    // TODO: Check if user has access to this node's project
    // const hasAccess = await checkProjectAccess(session.user.id, node.projectId);
    // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

    const comments = await getCanvasComments({ nodeId: id });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error fetching canvas comments:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

// POST /api/canvas/[id]/comments
const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  mentions: z.array(z.string().uuid()).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { id } = await params;

  try {
    // Check if node exists and user has access
    const node = await getCanvasNodeById({ id });
    if (!node) {
      return new ChatSDKError("not_found:api", "Canvas node not found").toResponse();
    }

    // TODO: Check if user has access to this node's project
    // const hasAccess = await checkProjectAccess(session.user.id, node.projectId);
    // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

    const body = await request.json();
    const data = createCommentSchema.parse(body);

    const newComment = await createCanvasComment({
      nodeId: id,
      projectId: node.projectId,
      authorId: session.user.id,
      content: data.content,
      mentions: data.mentions,
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError("bad_request:api", error.message).toResponse();
    }
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error creating canvas comment:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
