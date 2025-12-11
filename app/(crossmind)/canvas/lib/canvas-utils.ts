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
