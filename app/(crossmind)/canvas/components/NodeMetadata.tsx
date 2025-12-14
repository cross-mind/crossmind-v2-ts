"use client";

/**
 * NodeMetadata Component
 *
 * Displays type-specific metadata for different node types:
 * - Task: status, assignee, due date
 * - Idea: early-stage idea notice
 * - Inspiration: source, captured date
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { CanvasNode } from "../canvas-data";

export interface NodeMetadataProps {
  selectedNode: CanvasNode;
}

export function NodeMetadata({ selectedNode }: NodeMetadataProps) {
  // Task metadata
  if (selectedNode.type === "task") {
    return (
      <div className="mb-6 p-4 bg-background/60 border border-border/50 rounded-lg space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground mb-3">
          Task Info
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant={
                selectedNode.taskStatus === "done" ? "default" : "secondary"
              }
            >
              {selectedNode.taskStatus === "done" && "Done"}
              {selectedNode.taskStatus === "in-progress" && "In Progress"}
              {selectedNode.taskStatus === "todo" && "To Do"}
            </Badge>
          </div>
          {selectedNode.assignee && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assignee</span>
              <span>{selectedNode.assignee}</span>
            </div>
          )}
          {selectedNode.dueDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>
                {selectedNode.dueDate instanceof Date
                  ? selectedNode.dueDate.toLocaleDateString()
                  : selectedNode.dueDate}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Idea metadata
  if (selectedNode.type === "idea") {
    return (
      <div className="mb-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
        <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-500 mb-2">
          💡 Early-stage Idea
        </h4>
        <p className="text-xs text-muted-foreground">
          This is an unvalidated creative idea that can be refined with AI
          assistance or converted to a formal document for in-depth design.
        </p>
      </div>
    );
  }

  // Inspiration metadata
  if (selectedNode.type === "inspiration") {
    return (
      <div className="mb-6 p-4 bg-pink-500/5 border border-pink-500/20 rounded-lg">
        <h4 className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Inspiration Captured
        </h4>
        <div className="space-y-2 text-sm">
          {selectedNode.source && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Source</span>
              <span className="text-pink-600 dark:text-pink-400">
                {selectedNode.source}
              </span>
            </div>
          )}
          {selectedNode.capturedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Captured At</span>
              <span>
                {selectedNode.capturedAt instanceof Date
                  ? selectedNode.capturedAt.toLocaleDateString()
                  : selectedNode.capturedAt}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 p-2 bg-background/50 rounded border border-pink-500/10">
          💡 Tip: This inspiration can be transformed into a document or used as
          a reference for ideas
        </p>
      </div>
    );
  }

  // No metadata for document type
  return null;
}
