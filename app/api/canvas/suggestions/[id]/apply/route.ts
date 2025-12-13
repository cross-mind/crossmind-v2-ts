import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getCanvasSuggestionById,
  updateCanvasSuggestion,
} from "@/lib/db/queries";
import { executeSuggestion } from "@/lib/db/suggestion-actions";
import { ChatSDKError } from "@/lib/errors";

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
      return new ChatSDKError("unauthorized").toResponse();
    }

    const { id } = await params;

    // Get suggestion
    const suggestion = await getCanvasSuggestionById({ id });
    if (!suggestion) {
      return new ChatSDKError("not_found", "Suggestion not found").toResponse();
    }

    // Check if already applied or dismissed
    if (suggestion.status !== "pending") {
      return new ChatSDKError(
        "invalid:suggestion-status",
        `Suggestion is already ${suggestion.status}`
      ).toResponse();
    }

    // Execute the suggestion
    const result = await executeSuggestion(suggestion, session.user.id);

    if (!result.success) {
      return new ChatSDKError(
        "bad_request:execution",
        result.error || "Failed to execute suggestion"
      ).toResponse();
    }

    // For content-suggestion, don't mark as accepted yet
    // It will be marked when user sends first AI chat message
    if (suggestion.type !== "content-suggestion") {
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
