import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  getProjectFrameworkWithZones,
  getZonesWithNodeTitles,
} from "@/lib/db/queries";

type ViewFrameworkZonesProps = {
  session: Session;
  context: {
    projectFrameworkId: string;
  };
};

export const viewFrameworkZones = ({ session, context }: ViewFrameworkZonesProps) =>
  tool({
    description:
      "查看项目框架的区域结构，包含每个区域的节点列表（仅标题）以及未分配到任何区域的节点。默认使用当前分析的框架。",
    inputSchema: z.object({
      projectFrameworkId: z
        .string()
        .describe("项目框架ID，可选，默认使用当前分析框架")
        .optional(),
    }),
    execute: async ({ projectFrameworkId }) => {
      console.log("[viewFrameworkZones] Tool called with projectFrameworkId:", projectFrameworkId);
      try {
        // Use provided ID or fallback to context
        const frameworkId = projectFrameworkId || context.projectFrameworkId;
        console.log("[viewFrameworkZones] Using frameworkId:", frameworkId);

        const frameworkData = await getProjectFrameworkWithZones({
          projectFrameworkId: frameworkId,
        });
        console.log("[viewFrameworkZones] Framework data retrieved:", frameworkData ? "success" : "not found");

        if (!frameworkData) {
          return {
            error: `未找到框架 ID: ${frameworkId}`,
          };
        }

        const { zones: zonesWithNodes, unassignedNodes } = await getZonesWithNodeTitles({
          projectFrameworkId: frameworkId,
        });

        console.log("[viewFrameworkZones] Unassigned nodes count:", unassignedNodes.length);

        return {
          framework: {
            id: frameworkData.id,
            name: frameworkData.name,
            description: frameworkData.description,
          },
          zones: zonesWithNodes.map((z) => ({
            id: z.id,
            name: z.name,
            description: z.description,
            nodes: z.nodes,
          })),
          unassignedNodes: unassignedNodes.map((n) => ({
            id: n.id,
            title: n.title,
          })),
        };
      } catch (error) {
        return {
          error: `查询框架区域失败: ${error instanceof Error ? error.message : "未知错误"}`,
        };
      }
    },
  });
