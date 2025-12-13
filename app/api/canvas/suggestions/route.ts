import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getCanvasSuggestionsByFramework, getCanvasSuggestionsByNode } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/canvas/suggestions
 *
 * Fetch suggestions by framework or by node
 *
 * Query parameters:
 * - projectId: string (required)
 * - frameworkId?: string (for framework-level suggestions)
 * - nodeId?: string (for node-specific suggestions)
 * - status?: "pending" | "accepted" | "dismissed"
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:suggestions").toResponse();
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const frameworkId = searchParams.get("frameworkId");
    const nodeId = searchParams.get("nodeId");
    const status = searchParams.get("status") as "pending" | "accepted" | "dismissed" | null;

    if (!projectId) {
      return new ChatSDKError(
        "bad_request:suggestions",
        "projectId is required"
      ).toResponse();
    }

    // Fetch suggestions based on query type
    let suggestions;

    if (nodeId) {
      // Node-specific suggestions
      suggestions = await getCanvasSuggestionsByNode({
        nodeId,
        status: status || undefined,
      });
    } else if (frameworkId) {
      // Framework-level suggestions
      suggestions = await getCanvasSuggestionsByFramework({
        projectId,
        frameworkId,
        status: status || undefined,
      });
    } else {
      return new ChatSDKError(
        "bad_request:suggestions",
        "Either frameworkId or nodeId is required"
      ).toResponse();
    }

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("[Canvas Suggestions API] Error:", error);
    return new ChatSDKError(
      "bad_request:database",
      "Failed to fetch suggestions"
    ).toResponse();
  }
}
