import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  updateProjectFrameworkDimensionScore,
  updateProjectFrameworkHealth,
} from "@/lib/db/queries";
import type { ChatMessage } from "@/lib/types";

type UpdateFrameworkHealthProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  context: {
    projectFrameworkId: string;
  };
};

export const updateFrameworkHealth = ({
  session,
  dataStream,
  context,
}: UpdateFrameworkHealthProps) =>
  tool({
    description:
      "更新框架健康度评分，包含各维度分数和总分。每更新一个维度会流式发送进度更新。",
    inputSchema: z.object({
      dimensionScores: z
        .record(z.number())
        .describe("维度评分映射，例如 {coverage: 85, clarity: 90}"),
      overallScore: z.number().describe("总体健康度评分 (0-100)"),
      insights: z.string().describe("健康度分析洞察和建议"),
    }),
    execute: async ({ dimensionScores, overallScore, insights }) => {
      try {
        // 更新各维度评分
        for (const [dimensionKey, score] of Object.entries(dimensionScores)) {
          await updateProjectFrameworkDimensionScore({
            projectFrameworkId: context.projectFrameworkId,
            dimensionKey,
            score,
            insights: `${dimensionKey}: ${score}/100`,
          });

          // 流式发送维度更新
          dataStream.write({
            type: "data-dimension-score",
            data: { dimensionKey, score },
            transient: true,
          });
        }

        // 更新框架总分
        await updateProjectFrameworkHealth({
          id: context.projectFrameworkId,
          healthScore: overallScore,
          lastHealthCheckAt: new Date(),
        });

        // 流式发送总分更新
        dataStream.write({
          type: "data-framework-health",
          data: { overallScore, insights },
          transient: false, // 持久化
        });

        return {
          message: `健康度已更新：${overallScore}/100`,
          dimensionCount: Object.keys(dimensionScores).length,
        };
      } catch (error) {
        return {
          error: `更新健康度失败: ${error instanceof Error ? error.message : "未知错误"}`,
        };
      }
    },
  });
