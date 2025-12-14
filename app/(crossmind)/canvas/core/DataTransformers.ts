/**
 * Data Transformers for Canvas
 *
 * Centralizes all data transformation logic for Canvas components.
 * Provides pure functions for converting between database and UI formats.
 */

import type { CanvasNode as DBCanvasNode, CanvasNodeComment, CanvasNodeActivity } from "@/lib/db/schema";
import type { NodeContent, CanvasNode } from "../canvas-data";

/**
 * Format a relative timestamp (e.g., "5m ago", "2h ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return dateObj.toLocaleDateString();
}

/**
 * Extract stage from tags (e.g., "stage/ideation" -> "ideation")
 */
export function extractStageFromTags(tags: string[] | null): string | undefined {
  if (!tags) return undefined;
  const stageTag = tags.find(tag => tag.startsWith('stage/'));
  return stageTag?.split('/')[1];
}

/**
 * Convert database CanvasNode to NodeContent format
 */
export function dbNodeToNodeContent(dbNode: DBCanvasNode): NodeContent {
  return {
    id: dbNode.id,
    title: dbNode.title,
    content: dbNode.content,
    type: dbNode.type as "document" | "idea" | "task" | "inspiration",
    parentId: dbNode.parentId || undefined,
    tags: dbNode.tags || [],
    healthScore: dbNode.healthScore ? Number.parseInt(dbNode.healthScore) : undefined,
    references: dbNode.references || [],
    children: dbNode.children || [],
    displayOrder: dbNode.displayOrder,
    hiddenInFrameworks: (dbNode as any).hiddenInFrameworks || {},
  };
}

/**
 * Convert array of database nodes to NodeContent array
 */
export function dbNodesToNodeContents(dbNodes: DBCanvasNode[] | null | undefined): NodeContent[] {
  if (!dbNodes || dbNodes.length === 0) {
    return [];
  }
  return dbNodes.map(dbNodeToNodeContent);
}

/**
 * Transform database CanvasNodeComment to UI Comment format
 */
export interface UIComment {
  id: string;
  user: string;
  timestamp: string;
  content: string;
}

export function mapCommentToUI(comment: CanvasNodeComment, users: Map<string, string>): UIComment {
  return {
    id: comment.id,
    user: comment.authorId ? (users.get(comment.authorId) || comment.authorId.slice(0, 8)) : "Unknown",
    timestamp: formatRelativeTime(comment.createdAt),
    content: comment.content,
  };
}

/**
 * Transform database CanvasNodeActivity to UI FeedActivity format
 */
export interface UIFeedActivity {
  id: string;
  type: "created" | "updated" | "status_changed" | "tag_added" | "comment_added";
  user: string;
  timestamp: string;
  description?: string;
  details?: string;
}

export function mapActivityToUI(activity: CanvasNodeActivity, users: Map<string, string>): UIFeedActivity {
  return {
    id: activity.id,
    type: activity.type as "created" | "updated" | "status_changed" | "tag_added" | "comment_added",
    user: activity.userId ? (users.get(activity.userId) || activity.userId.slice(0, 8)) : "System",
    timestamp: formatRelativeTime(activity.createdAt),
    description: activity.description,
    details: activity.details || undefined,
  };
}
