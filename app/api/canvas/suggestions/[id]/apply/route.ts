import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getCanvasSuggestionById,
  updateCanvasSuggestion,
} from "@/lib/db/queries";
import { executeSuggestion } from "@/lib/db/suggestion-actions";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/canvas/suggestions/[id]/apply
 *
 * Execute a suggestion and mark it as applied
 *
 * For content-suggestion type:
 * - Returns prompt template for AI Chat
 * - Does NOT mark as accepted immediately (waits for user to send first message)
 *
 * For other types:
 * - Executes the action immediately
 * - Marks as accepted with timestamp and user ID
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

    // Check if already applied or dismissed
    if (suggestion.status !== "pending") {
      return new ChatSDKError(
        "bad_request:suggestions",
        `Suggestion is already ${suggestion.status}`
      ).toResponse();
    }

    // Execute the suggestion
    console.log("[Apply Suggestion API] Executing suggestion:", {
      id: suggestion.id,
      type: suggestion.type,
      hasActionParams: !!suggestion.actionParams,
      actionParams: suggestion.actionParams,
    });

    const result = await executeSuggestion(suggestion, session.user.id);

    console.log("[Apply Suggestion API] Execution result:", result);

    if (!result.success) {
      console.error("[Apply Suggestion API] Execution failed:", result.error);
      return new ChatSDKError(
        "bad_request:suggestions",
        result.error || "Failed to execute suggestion"
      ).toResponse();
    }

    // For content-suggestion and health-issue, don't mark as accepted yet
    // They open AI chat and will be marked when user sends first message
    if (suggestion.type !== "content-suggestion" && suggestion.type !== "health-issue") {
      await updateCanvasSuggestion({
        id,
        status: "accepted",
        appliedAt: new Date(),
        appliedById: session.user.id,
      });
    }

    return NextResponse.json({
      success: true,
      type: suggestion.type,
      result,
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("[Apply Suggestion API] Error:", error);
    return new ChatSDKError(
      "bad_request:database",
      "Failed to apply suggestion"
    ).toResponse();
  }
}
