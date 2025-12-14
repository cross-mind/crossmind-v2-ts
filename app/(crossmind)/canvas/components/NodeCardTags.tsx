"use client";

/**
 * NodeCardTags Component
 *
 * Displays the tags section of a Canvas node card with:
 * - Colored tag badges (type, stage, priority)
 * - Maximum 3 tags shown with "+N" overflow indicator
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";
import type { CanvasNode } from "../canvas-data";

export interface NodeCardTagsProps {
  node: CanvasNode;
}

export function NodeCardTags({ node }: NodeCardTagsProps) {
  // Don't render if node has no tags
  if (!node.tags || node.tags.length === 0) {
    return null;
  }

  const tagColors: Record<string, string> = {
    type: "bg-blue-500/10 text-blue-600",
    stage: "bg-green-500/10 text-green-600",
    priority: "bg-orange-500/10 text-orange-600",
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {node.tags.slice(0, 3).map((tag) => {
        const [namespace, value] = tag.split("/");

        return (
          <div
            key={tag}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
              tagColors[namespace] || "bg-muted text-muted-foreground"
            )}
          >
            <Tag className="h-2.5 w-2.5" />
            {value}
          </div>
        );
      })}
      {node.tags.length > 3 && (
        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
          +{node.tags.length - 3}
        </div>
      )}
    </div>
  );
}
