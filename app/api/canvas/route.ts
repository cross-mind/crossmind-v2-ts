import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { createCanvasNode, getCanvasNodesByProjectId } from "@/lib/db/queries";

// GET /api/canvas?projectId=xxx
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    console.log('[Canvas API] Unauthorized - no session');
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  console.log('[Canvas API] GET request:', {
    userId: session.user.id,
    projectId,
    hasProjectId: !!projectId
  });

  if (!projectId) {
    console.log('[Canvas API] Missing projectId');
    return new ChatSDKError("bad_request:api", "projectId is required").toResponse();
  }

  // TODO: Check if user has access to this project
  // const hasAccess = await checkProjectAccess(session.user.id, projectId);
  // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

  try {
    const nodes = await getCanvasNodesByProjectId({ projectId });
    return NextResponse.json({ nodes }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("[Canvas API] Error fetching canvas nodes:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}

// POST /api/canvas
const createNodeSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(500),
  content: z.string(),
  type: z.enum(["document", "idea", "task", "inspiration"]),
  parentId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  positions: z.record(z.object({ x: z.number(), y: z.number() })).optional(),
  zoneAffinities: z.record(z.record(z.number())).optional(),
  taskStatus: z.enum(["todo", "in-progress", "done"]).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  source: z.string().optional(),
  capturedAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const body = await request.json();
    const data = createNodeSchema.parse(body);

    // TODO: Check if user has access to this project
    // const hasAccess = await checkProjectAccess(session.user.id, data.projectId);
    // if (!hasAccess) return new ChatSDKError("forbidden:api").toResponse();

    const newNode = await createCanvasNode({
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      capturedAt: data.capturedAt ? new Date(data.capturedAt) : undefined,
      createdById: session.user.id,
    });

    return NextResponse.json({ node: newNode }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError("bad_request:api", error.message).toResponse();
    }
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error creating canvas node:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
