/**
 * Canvas Utility Functions
 * Pure functions for data transformation and calculations
 */

import type { CanvasNode as DBCanvasNode } from "@/lib/db/schema";
import type { NodeContent } from "./canvas-types";

/**
 * Extract stage from tags array
 */
export function extractStageFromTags(tags: string[] | null): string | undefined {
  if (!tags) return undefined;
  const stageTag = tags.find((tag) => tag.startsWith("stage/"));
  return stageTag?.replace("stage/", "");
}

/**
 * Convert database node to Canvas NodeContent format
 */
export function dbNodeToNodeContent(dbNode: DBCanvasNode): NodeContent {
  return {
    id: dbNode.id,
    title: dbNode.title,
    content: dbNode.content,
    type: dbNode.type as "document" | "idea" | "task" | "inspiration",
    tags: dbNode.tags || [],
    stage: extractStageFromTags(dbNode.tags),
    health: dbNode.healthScore ? Number.parseInt(dbNode.healthScore) : undefined,
    references: dbNode.references || [],
    children: dbNode.children || [],
    zoneAffinities: dbNode.zoneAffinities as Record<string, Record<string, number>> | undefined,
  };
}

/**
 * Convert array of database nodes to NodeContent array
 */
export function dbNodesToNodeContents(dbNodes: DBCanvasNode[]): NodeContent[] {
  return dbNodes.map(dbNodeToNodeContent);
}

/**
 * Get node type emoji
 */
export function getNodeTypeEmoji(type: NodeContent["type"]): string {
  const emojiMap = {
    document: "📄",
    idea: "💡",
    task: "☑️",
    inspiration: "✨",
  };
  return emojiMap[type];
}

/**
 * Get health level color
 */
export function getHealthColor(health: number | undefined): string {
  if (!health) return "text-muted-foreground";
  if (health >= 80) return "text-green-600";
  if (health >= 60) return "text-yellow-600";
  if (health >= 40) return "text-orange-600";
  return "text-red-600";
}

/**
 * Get health level badge variant
 */
export function getHealthBadgeVariant(health: number | undefined): "default" | "secondary" | "destructive" | "outline" {
  if (!health) return "outline";
  if (health >= 80) return "default";
  if (health >= 60) return "secondary";
  return "destructive";
}

/**
 * Calculate the next displayOrder for a node in a specific zone
 * @param nodes - All canvas nodes (with displayOrder and zoneAffinities)
 * @param frameworkId - Current framework ID (null for unassigned)
 * @param zoneKey - Target zone key (null for unassigned)
 * @returns Next displayOrder value (incremented by 1000 for spacing)
 */
export function calculateNextDisplayOrderInZone(
  nodes: { id: string; displayOrder?: number; zoneAffinities?: Record<string, Record<string, number>> }[],
  frameworkId: string | null,
  zoneKey: string | null
): number {
  if (!frameworkId || !zoneKey) {
    // For unassigned nodes, get max displayOrder of all unassigned nodes
    const unassignedNodes = nodes.filter(
      (node) => !node.zoneAffinities || Object.keys(node.zoneAffinities).length === 0
    );

    const maxOrder = Math.max(...unassignedNodes.map((n) => n.displayOrder ?? 0), 0);

    return maxOrder + 1000;
  }

  // Find nodes in this zone
  const nodesInZone = nodes.filter((node) => {
    const affinities = node.zoneAffinities?.[frameworkId];
    return affinities && affinities[zoneKey] > 0;
  });

  // Get max displayOrder
  const maxOrder = Math.max(...nodesInZone.map((n) => n.displayOrder ?? 0), 0);

  // Return next order (increment by 1000 for spacing)
  return maxOrder + 1000;
}
