/**
 * Canvas Helper Functions
 * Utility functions for canvas operations
 */

import type { CanvasNode } from "../canvas-data";

/**
 * Extract stage from tags
 * @param tags Array of tag strings
 * @returns Stage name or undefined
 */
export function extractStageFromTags(
  tags: string[] | null | undefined
): "ideation" | "research" | "design" | "dev" | "launch" | undefined {
  if (!tags) return undefined;

  for (const tag of tags) {
    if (tag.startsWith("stage/")) {
      const stage = tag.replace("stage/", "");
      if (
        stage === "ideation" ||
        stage === "research" ||
        stage === "design" ||
        stage === "dev" ||
        stage === "launch"
      ) {
        return stage;
      }
    }
  }
  return undefined;
}

