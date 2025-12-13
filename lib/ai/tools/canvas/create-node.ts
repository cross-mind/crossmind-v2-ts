import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { createCanvasNode } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type CreateNodeProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  context: {
    projectId: string;
    nodeId: string;
  };
};

export const createNode = ({ session, dataStream, context }: CreateNodeProps) =>
  tool({
    description: "Create a new node in the Canvas. Use this to add new ideas, documents, tasks, or inspiration based on the conversation.",
    inputSchema: z.object({
      title: z.string().describe("The title of the new node"),
      content: z.string().describe("The content/description of the new node"),
      type: z.enum(["document", "idea", "task", "inspiration"]).describe("The type of node to create"),
      parentId: z.string().optional().describe("Parent node ID if creating a child node"),
      tags: z.array(z.string()).optional().describe("Tags to categorize the node"),
    }),
    execute: async ({ title, content, type, parentId, tags }) => {
      try {
        // Create the new canvas node
        const newNode = await createCanvasNode({
          title,
          content,
          type,
          projectId: context.projectId,
          parentId: parentId || null,
          tags: tags || [],
          createdById: session.user.id,
        });

        // Notify frontend via data stream
        dataStream.write({
          type: "node-created" as any,
          data: {
            nodeId: newNode.id,
            title: newNode.title,
            type: newNode.type,
          },
          transient: true,
        });

        return {
          success: true,
          nodeId: newNode.id,
          message: `Created new ${type} node: "${title}"`,
        };
      } catch (error) {
        console.error("[createNode] Error:", error);
        return {
          success: false,
          error: "Failed to create node",
        };
      }
    },
  });
