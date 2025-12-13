import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getCanvasSuggestionById,
  updateCanvasSuggestion,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/canvas/suggestions/[id]/dismiss
 *
 * Dismiss a suggestion (mark as not applicable)
 * Updates status to "dismissed" with timestamp and user ID
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:suggestions").toResponse();
    }

    const { id } = await params;

    // Get suggestion
    const suggestion = await getCanvasSuggestionById({ id });
    if (!suggestion) {
      return new ChatSDKError("not_found:suggestions", "Suggestion not found").toResponse();
    }

    // Check if already dismissed
    if (suggestion.status === "dismissed") {
      return new ChatSDKError(
        "bad_request:suggestions",
        "Suggestion is already dismissed"
      ).toResponse();
    }

    // Update to dismissed status
    const updated = await updateCanvasSuggestion({
      id,
      status: "dismissed",
      dismissedAt: new Date(),
      dismissedById: session.user.id,
    });

    return NextResponse.json({
      success: true,
      suggestion: updated,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("[Dismiss Suggestion API] Error:", error);
    return new ChatSDKError(
      "bad_request:database",
      "Failed to dismiss suggestion"
    ).toResponse();
  }
}
