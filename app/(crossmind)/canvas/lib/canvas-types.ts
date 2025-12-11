/**
 * Canvas Type Definitions
 * Centralized type definitions for the Canvas system
 */

import type { CanvasNode as DBCanvasNode } from "@/lib/db/schema";

export type StageFilter = "all" | "ideation" | "research" | "design" | "dev" | "launch";

export interface NodeContent {
  id: string;
  title: string;
  content: string;
  type: "document" | "idea" | "task" | "inspiration";
  tags: string[];
  stage?: string;
  health?: number;
  references?: string[];
  children?: string[];
  zoneAffinities?: Record<string, Record<string, number>>;
}

export interface CanvasNode extends NodeContent {
  x: number;
  y: number;
  width: number;
  height: number;
  zoneId?: string;
}

export interface FeedActivity {
  id: string;
  type: "create" | "update" | "comment" | "suggestion";
  nodeId: string;
  nodeTitle: string;
  user: string;
  timestamp: string;
  content?: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  mentions?: string[];
}

export interface AISuggestion {
  id: string;
  type: "improve" | "connect" | "expand" | "risk";
  nodeId: string;
  nodeTitle: string;
  content: string;
  priority: "high" | "medium" | "low";
}

export interface ZoneConfig {
  startX: number;
  startY: number;
  columnCount: number;
  nodeIds: string[];
}

export interface ThinkingFramework {
  id: string;
  name: string;
  icon: string;
  description: string;
  zones: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
  }>;
}

export interface CanvasViewProps {
  projectId: string | null;
  isLoading: boolean;
  isError: boolean;
}
