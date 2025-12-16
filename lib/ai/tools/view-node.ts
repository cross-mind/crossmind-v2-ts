import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  getCanvasNodeById,
  getCanvasActivities,
  getCanvasComments,
} from "@/lib/db/queries";
import type { CanvasNodeActivity, CanvasNodeComment } from "@/lib/db/schema";

type ViewNodeProps = {
  session: Session;
};

export const viewNode = ({ session }: ViewNodeProps) =>
  tool({
    description:
      "查看指定节点的完整详情，包含内容、标签、健康度数据、活动历史和评论等。",
    inputSchema: z.object({
      nodeId: z.string().describe("节点ID"),
    }),
    execute: async ({ nodeId }) => {
      try {
        const node = await getCanvasNodeById({ id: nodeId });

        if (!node) {
          return {
            error: `未找到节点 ID: ${nodeId}`,
          };
        }

        const activities = await getCanvasActivities({ nodeId });
        const comments = await getCanvasComments({ nodeId });

        return {
          id: node.id,
          title: node.title,
          content: node.content,
          type: node.type,
          tags: node.tags || [],
          healthScore: node.healthScore,
          healthLevel: node.healthLevel,
          healthData: node.healthData,
          activities: activities.map((a: CanvasNodeActivity) => ({
            type: a.type,
            description: a.description,
            createdAt: a.createdAt,
          })),
          comments: comments.map((c: CanvasNodeComment) => ({
            content: c.content,
            authorId: c.authorId,
            createdAt: c.createdAt,
          })),
        };
      } catch (error) {
        return {
          error: `查询节点失败: ${error instanceof Error ? error.message : "未知错误"}`,
        };
      }
    },
  });
