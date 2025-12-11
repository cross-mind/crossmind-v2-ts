import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
  deleteCanvasNode,
  getCanvasNodeById,
  updateCanvasNode,
} from "@/lib/db/queries";

// GET /api/canvas/[id]
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
    const node = await getCanvasNodeById({ id });

    if (!node) {
      return new ChatSDKError("not_found:api", "Canvas node not found").toResponse();
    }

    // TODO: Check if user has access to this node's project
    // const hasAccess = await checkProjectAccess(session.user.id, node.projectId);
    // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

    return NextResponse.json({ node }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error fetching canvas node:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

// PATCH /api/canvas/[id]
const updateNodeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  positions: z.record(z.object({ x: z.number(), y: z.number() })).optional(),
  tags: z.array(z.string()).optional(),
  taskStatus: z.enum(["todo", "in-progress", "done"]).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export async function PATCH(
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
    const existingNode = await getCanvasNodeById({ id });
    if (!existingNode) {
      return new ChatSDKError("not_found:api", "Canvas node not found").toResponse();
    }

    // TODO: Check if user has access to this node's project
    // const hasAccess = await checkProjectAccess(session.user.id, existingNode.projectId);
    // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

    const body = await request.json();
    const data = updateNodeSchema.parse(body);

    const updated = await updateCanvasNode({
      id,
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    return NextResponse.json({ node: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError("bad_request:api", error.message).toResponse();
    }
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error updating canvas node:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

// DELETE /api/canvas/[id]
export async function DELETE(
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
    const existingNode = await getCanvasNodeById({ id });
    if (!existingNode) {
      return new ChatSDKError("not_found:api", "Canvas node not found").toResponse();
    }

    // TODO: Check if user has access to this node's project
    // const hasAccess = await checkProjectAccess(session.user.id, existingNode.projectId);
    // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

    await deleteCanvasNode({ id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error deleting canvas node:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
