import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { deleteCanvasNode, getCanvasNodeById } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type DeleteNodeProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  context: {
    projectId: string;
    nodeId: string;
  };
};

export const deleteNode = ({ session, dataStream, context }: DeleteNodeProps) =>
  tool({
    description: "Delete a Canvas node. IMPORTANT: This is a destructive action. Only use when the user explicitly asks to delete a node. If deleting the current node, the chat session will no longer have context.",
    inputSchema: z.object({
      nodeId: z.string().describe("The ID of the node to delete. Cannot be omitted - deletion must be explicit."),
      reason: z.string().optional().describe("Optional reason for deletion (for audit trail)"),
    }),
    execute: async ({ nodeId, reason }) => {
      try {
        // Verify the node exists and belongs to the project
        const node = await getCanvasNodeById({ id: nodeId });

        if (!node) {
          return {
            success: false,
            error: "Node not found",
          };
        }

        if (node.projectId !== context.projectId) {
          return {
            success: false,
            error: "Node does not belong to this project",
          };
        }

        // Delete the node
        await deleteCanvasNode({ id: nodeId });

        // Notify frontend via data stream
        dataStream.write({
          type: "node-deleted",
          data: {
            nodeId,
            title: node.title,
            reason,
          },
          transient: true,
        } as any);

        // Warn if deleted the current node
        const isCurrentNode = nodeId === context.nodeId;
        const warningMessage = isCurrentNode
          ? " Note: You deleted the current node. This chat session's context node no longer exists."
          : "";

        return {
          success: true,
          nodeId,
          deletedTitle: node.title,
          message: `Deleted node: "${node.title}"${warningMessage}`,
        };
      } catch (error) {
        console.error("[deleteNode] Error:", error);
        return {
          success: false,
          error: "Failed to delete node",
        };
      }
    },
  });
