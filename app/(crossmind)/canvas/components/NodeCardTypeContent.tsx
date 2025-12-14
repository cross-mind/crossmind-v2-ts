"use client";

/**
 * NodeCardTypeContent Component
 *
 * Displays type-specific metadata for different node types in the canvas card:
 * - Task: status indicator, assignee, due date
 * - Inspiration: source, captured date
 * - Document/Idea: no specific content (returns null)
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar, Clock, User } from "lucide-react";
import type { CanvasNode } from "../canvas-data";

export interface NodeCardTypeContentProps {
  node: CanvasNode;
}

export function NodeCardTypeContent({ node }: NodeCardTypeContentProps) {
  // Task metadata
  if (node.type === "task") {
    return (
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-medium",
              node.taskStatus === "done" && "bg-green-500/10 text-green-600",
              node.taskStatus === "in-progress" &&
                "bg-blue-500/10 text-blue-600",
              node.taskStatus === "todo" && "bg-gray-500/10 text-gray-600"
            )}
          >
            {node.taskStatus === "done" && "✓ 已完成"}
            {node.taskStatus === "in-progress" && "⟳ 进行中"}
            {node.taskStatus === "todo" && "○ 待开始"}
          </div>
          {node.assignee && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              {node.assignee}
            </div>
          )}
        </div>
        {node.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            截止{" "}
            {node.dueDate instanceof Date
              ? node.dueDate.toLocaleDateString()
              : node.dueDate}
          </div>
        )}
      </div>
    );
  }

  // Inspiration metadata
  if (node.type === "inspiration" && (node.source || node.capturedAt)) {
    return (
      <div className="mb-3 space-y-1">
        {node.source && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>📚 {node.source}</span>
          </div>
        )}
        {node.capturedAt && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {node.capturedAt instanceof Date
              ? node.capturedAt.toLocaleDateString()
              : node.capturedAt}
          </div>
        )}
      </div>
    );
  }

  // No type-specific content for document/idea or if inspiration has no source/capturedAt
  return null;
}
