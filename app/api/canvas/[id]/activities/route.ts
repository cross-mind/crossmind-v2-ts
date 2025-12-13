import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { getCanvasActivities, getCanvasNodeById } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

// GET /api/canvas/[id]/activities
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

    const activities = await getCanvasActivities({ nodeId: id });

    return NextResponse.json({ activities }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Error fetching canvas activities:", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
