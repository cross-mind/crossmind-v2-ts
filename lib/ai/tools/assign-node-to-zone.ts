import { tool } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { updateNodeAffinities } from "@/lib/db/queries";
import { projectFramework, projectFrameworkZone } from "@/lib/db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

type AssignNodeToZoneProps = {
  session: Session;
  context: {
    projectFrameworkId: string;
  };
};

/**
 * Helper function to resolve zone names (中文) to zone keys (英文)
 */
async function resolveZoneKeys(
  projectFrameworkId: string,
  zoneNames: string[]
): Promise<Record<string, string>> {
  // Get all zones for this project framework
  const zones = await db
    .select({
      name: projectFrameworkZone.name,
      zoneKey: projectFrameworkZone.zoneKey,
    })
    .from(projectFrameworkZone)
    .where(eq(projectFrameworkZone.projectFrameworkId, projectFrameworkId));

  // Build mapping: zoneName → zoneKey
  const nameToKey = new Map<string, string>();
  for (const zone of zones) {
    if (zone.name && zone.zoneKey) {
      nameToKey.set(zone.name, zone.zoneKey);
      // Also add lowercase version for case-insensitive matching
      nameToKey.set(zone.name.toLowerCase(), zone.zoneKey);
    }
  }

  // Resolve each zone name to its key
  const result: Record<string, string> = {};
  for (const zoneName of zoneNames) {
    const zoneKey = nameToKey.get(zoneName) || nameToKey.get(zoneName.toLowerCase());
    if (zoneKey) {
      result[zoneName] = zoneKey;
    } else {
      console.warn(`[assignNodeToZone] Zone name not found: ${zoneName}`);
    }
  }

  return result;
}

export const assignNodeToZone = ({ session, context }: AssignNodeToZoneProps) =>
  tool({
    description:
      "为节点分配或调整区域归属。可以将未分配的节点分配到某个区域，或者调整已分配节点的区域关系。支持为一个节点设置多个区域的亲和度（affinity weights）。使用区域的显示名称（如'增长指标'、'留存分析'、'问题'、'解决方案'等），工具会自动查找对应的区域。",
    inputSchema: z.object({
      nodeId: z
        .string()
        .describe("节点ID"),
      zoneName: z
        .string()
        .describe("主要区域名称（使用从viewFrameworkZones工具获取的区域名称，如'增长指标'、'留存分析'、'问题'、'解决方案'等）"),
      primaryWeight: z
        .number()
        .min(0)
        .max(1)
        .default(0.9)
        .describe("主要区域的亲和度权重，默认0.9。权重越高，节点与该区域的关联越强"),
      additionalZones: z
        .array(
          z.object({
            zoneName: z.string().describe("额外区域名称"),
            weight: z.number().min(0).max(1).describe("该区域的亲和度权重"),
          })
        )
        .optional()
        .describe("可选：节点可能关联的其他区域及其权重"),
    }),
    execute: async ({ nodeId, zoneName, primaryWeight, additionalZones }) => {
      console.log("[assignNodeToZone] Tool called:", {
        nodeId,
        zoneName,
        primaryWeight,
        additionalZones,
      });

      try {
        // Collect all zone names to resolve
        const zoneNamesToResolve = [zoneName];
        if (additionalZones && additionalZones.length > 0) {
          zoneNamesToResolve.push(...additionalZones.map((z) => z.zoneName));
        }

        // Resolve zone names to zone keys
        const nameToKey = await resolveZoneKeys(
          context.projectFrameworkId,
          zoneNamesToResolve
        );

        console.log("[assignNodeToZone] Resolved zone keys:", nameToKey);

        // Check if primary zone was found
        if (!nameToKey[zoneName]) {
          return {
            success: false,
            error: `未找到区域「${zoneName}」，请确认区域名称是否正确。可用区域请通过 viewFrameworkZones 工具查看。`,
            nodeId,
            zoneName,
          };
        }

        // Build affinities object: { zoneKey: weight }
        const affinities: Record<string, number> = {};

        // Add primary zone
        affinities[nameToKey[zoneName]] = primaryWeight;

        // Add additional zones if provided
        if (additionalZones && additionalZones.length > 0) {
          for (const zone of additionalZones) {
            const zoneKey = nameToKey[zone.zoneName];
            if (zoneKey) {
              affinities[zoneKey] = zone.weight;
            } else {
              console.warn(`[assignNodeToZone] Skipping unknown zone: ${zone.zoneName}`);
            }
          }
        }

        console.log("[assignNodeToZone] Affinities to set:", affinities);

        // Update node affinities using existing function
        await updateNodeAffinities(
          nodeId,
          context.projectFrameworkId,
          affinities
        );

        console.log("[assignNodeToZone] Node affinity updated successfully");

        return {
          success: true,
          message: `节点已成功分配到「${zoneName}」区域（权重: ${primaryWeight}）`,
          nodeId,
          zoneName,
          primaryWeight,
          additionalZones: additionalZones || [],
          appliedAffinities: affinities,
        };
      } catch (error) {
        console.error("[assignNodeToZone] Error:", error);
        return {
          success: false,
          error: `分配节点失败: ${error instanceof Error ? error.message : "未知错误"}`,
          nodeId,
          zoneName,
        };
      }
    },
  });
