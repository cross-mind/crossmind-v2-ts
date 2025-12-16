import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { db } from "@/lib/db";
import { canvasSuggestion, canvasNode } from "@/lib/db/schema";
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

    // Fetch suggestion
    const [suggestion] = await db
      .select()
      .from(canvasSuggestion)
      .where(eq(canvasSuggestion.id, suggestionId))
      .limit(1);

    if (!suggestion) {
      return new ChatSDKError("not_found:api", "Suggestion not found").toResponse();
    }

    // Apply suggestion based on type
    switch (suggestion.type) {
      case "add-node": {
        // Create new node from suggestion
        const actionParams = suggestion.actionParams as {
          title: string;
          content?: string;
          type?: string;
          projectFrameworkId?: string;
        };

        await db.insert(canvasNode).values({
          projectId: suggestion.projectId,
          title: actionParams.title,
          content: actionParams.content || "",
          type: (actionParams.type as any) || "idea",
          projectFrameworkId: actionParams.projectFrameworkId || suggestion.projectFrameworkId,
          tags: [],
          positions: {},
          zoneAffinities: {},
          healthLevel: "good",
          createdById: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;
      }

      case "add-tag": {
        // Add tag to existing node
        if (suggestion.nodeId) {
          const actionParams = suggestion.actionParams as { tag: string };
          const [node] = await db
            .select()
            .from(canvasNode)
            .where(eq(canvasNode.id, suggestion.nodeId))
            .limit(1);

          if (node) {
            const currentTags = (node.tags as string[]) || [];
            if (!currentTags.includes(actionParams.tag)) {
              await db
                .update(canvasNode)
                .set({
                  tags: [...currentTags, actionParams.tag],
                  updatedAt: new Date(),
                })
                .where(eq(canvasNode.id, suggestion.nodeId));
            }
          }
        }
        break;
      }

      case "refine-content":
      case "content-suggestion": {
        // Update node content
        if (suggestion.nodeId) {
          const actionParams = suggestion.actionParams as { content: string };
          await db
            .update(canvasNode)
            .set({
              content: actionParams.content,
              updatedAt: new Date(),
            })
            .where(eq(canvasNode.id, suggestion.nodeId));
        }
        break;
      }

      case "health-issue": {
        // Mark issue as acknowledged (no direct action needed)
        // The suggestion itself serves as documentation
        break;
      }

      default:
        return new ChatSDKError(
          "bad_request:api",
          `Unknown suggestion type: ${suggestion.type}`,
        ).toResponse();
    }

    // Update suggestion status
    await db
      .update(canvasSuggestion)
      .set({
        status: "accepted",
        appliedAt: new Date(),
        appliedById: session.user.id,
      })
      .where(eq(canvasSuggestion.id, suggestionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Canvas Suggestion Apply]", error);
    return new ChatSDKError(
      "bad_request:database",
      error instanceof Error ? error.message : "Failed to apply suggestion",
    ).toResponse();
  }
}
