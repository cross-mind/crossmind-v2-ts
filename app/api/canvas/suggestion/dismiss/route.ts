import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { db } from "@/lib/db";
import { canvasSuggestion } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const { suggestionId } = await request.json();

    if (!suggestionId) {
      return new ChatSDKError("bad_request:api", "Missing suggestionId").toResponse();
    }

    // Verify suggestion exists
    const [suggestion] = await db
      .select()
      .from(canvasSuggestion)
      .where(eq(canvasSuggestion.id, suggestionId))
      .limit(1);

    if (!suggestion) {
      return new ChatSDKError("not_found:api", "Suggestion not found").toResponse();
    }

    // Update suggestion status to dismissed
    await db
      .update(canvasSuggestion)
      .set({
        status: "dismissed",
        dismissedAt: new Date(),
        dismissedById: session.user.id,
      })
      .where(eq(canvasSuggestion.id, suggestionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Canvas Suggestion Dismiss]", error);
    return new ChatSDKError(
      "bad_request:database",
      error instanceof Error ? error.message : "Failed to dismiss suggestion",
    ).toResponse();
  }
}
