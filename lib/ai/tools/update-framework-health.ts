import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  updateProjectFrameworkDimensionScore,
  updateProjectFrameworkHealth,
  getProjectFrameworkWithZones,
} from "@/lib/db/queries";
import { calculateWeightedScore } from "@/lib/canvas/framework-weights";
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
        // Get framework to determine sourceFrameworkId
        const framework = await getProjectFrameworkWithZones({
          projectFrameworkId: context.projectFrameworkId,
        });
        if (!framework) {
          return { error: "框架不存在" };
        }

        // Update each dimension score
        for (const [dimensionKey, score] of Object.entries(dimensionScores)) {
          await updateProjectFrameworkDimensionScore({
            projectFrameworkId: context.projectFrameworkId,
            dimensionKey,
            score,
            insights: `${dimensionKey}: ${score}/100`,
          });

          // Stream dimension update
          dataStream.write({
            type: "data-dimension-score",
            data: { dimensionKey, score },
            transient: true,
          });
        }

        // Calculate weighted average score
        const calculatedScore = calculateWeightedScore(
          dimensionScores,
          framework.sourceFrameworkId || "lean-canvas" // fallback to lean-canvas
        );

        const finalScore = calculatedScore !== null ? Math.round(calculatedScore) : overallScore;

        // Update framework health score
        await updateProjectFrameworkHealth({
          id: context.projectFrameworkId,
          healthScore: finalScore,
          lastHealthCheckAt: new Date(),
        });

        // Stream overall score update
        dataStream.write({
          type: "data-framework-health",
          data: { overallScore: finalScore, insights },
          transient: false, // Persist
        });

        return {
          message: `健康度已更新：${finalScore}/100（基于 ${Object.keys(dimensionScores).length} 个维度的加权平均）`,
          dimensionCount: Object.keys(dimensionScores).length,
          calculatedScore: finalScore,
        };
      } catch (error) {
        return {
          error: `更新健康度失败: ${error instanceof Error ? error.message : "未知错误"}`,
        };
      }
    },
  });
