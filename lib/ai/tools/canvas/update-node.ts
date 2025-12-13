import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { updateCanvasNode } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type UpdateNodeProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  context: {
    projectId: string;
    nodeId: string;  // Current node being discussed
  };
};

export const updateNode = ({ session, dataStream, context }: UpdateNodeProps) =>
  tool({
    description: "Update an existing Canvas node's content, title, tags, or other properties. If no nodeId is specified, updates the current node being discussed.",
    inputSchema: z.object({
      nodeId: z.string().optional().describe("The ID of the node to update. Defaults to current node if not specified"),
      title: z.string().optional().describe("New title for the node"),
      content: z.string().optional().describe("New content for the node"),
      tags: z.array(z.string()).optional().describe("New tags for the node (replaces existing tags)"),
      type: z.enum(["document", "idea", "task", "inspiration"]).optional().describe("Change the node type"),
    }),
    execute: async ({ nodeId, title, content, tags, type }) => {
      try {
        // Use current node if nodeId not specified
        const targetNodeId = nodeId || context.nodeId;

        // Build update object with only provided fields
        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (tags !== undefined) updates.tags = tags;
        if (type !== undefined) updates.type = type;

        // Update the node
        await updateCanvasNode({
          id: targetNodeId,
          ...updates,
        });

        // Notify frontend via data stream
        dataStream.write({
          type: "node-updated",
          data: {
            nodeId: targetNodeId,
            updates,
          },
          transient: true,
        } as any);

        const changesList = Object.keys(updates).join(", ");
        return {
          success: true,
          nodeId: targetNodeId,
          message: `Updated node: ${changesList}`,
        };
      } catch (error) {
        console.error("[updateNode] Error:", error);
        return {
          success: false,
          error: "Failed to update node",
        };
      }
    },
  });
