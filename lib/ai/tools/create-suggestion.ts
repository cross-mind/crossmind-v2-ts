import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { createCanvasSuggestion } from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type CreateSuggestionProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  context: {
    projectId: string;
    projectFrameworkId: string;
    chatId: string;
  };
};

export const createSuggestion = ({
  session,
  dataStream,
  context,
}: CreateSuggestionProps) =>
  tool({
    description:
      "创建单个改进建议，自动保存到数据库并流式更新 UI。建议会以 artifact 形式在会话中展示。",
    inputSchema: z.object({
      nodeId: z.string().describe("节点ID，可选，如果是全局建议则不提供").optional(),
      type: z
        .enum(["add-node", "add-tag", "refine-content", "content-suggestion", "health-issue"])
        .describe("建议类型"),
      title: z.string().describe("建议标题，简洁描述改进点"),
      description: z.string().describe("建议详细描述"),
      reason: z.string().describe("为什么提出这个建议的原因").optional(),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .describe("优先级")
        .default("medium"),
      actionParams: z
        .any()
        .describe("建议的执行参数，根据类型不同而不同")
        .optional(),
    }),
    execute: async ({ nodeId, type, title, description, reason, priority, actionParams }) => {
      try {
        // 保存建议到数据库
        const suggestion = await createCanvasSuggestion({
          projectId: context.projectId,
          projectFrameworkId: context.projectFrameworkId,
          chatId: context.chatId,
          nodeId,
          type,
          title,
          description,
          reason,
          priority,
          actionParams,
          source: "ai-health-check",
        });

        // 流式发送 artifact 更新
        dataStream.write({
          type: "data-health-suggestion",
          data: {
            suggestionId: suggestion.id,
            type,
            title,
            description,
            reason,
            priority,
            nodeId,
            actionParams,
          },
          transient: false, // 持久化数据
        });

        return {
          suggestionId: suggestion.id,
          message: `建议已创建：${title}`,
        };
      } catch (error) {
        return {
          error: `创建建议失败: ${error instanceof Error ? error.message : "未知错误"}`,
        };
      }
    },
  });
