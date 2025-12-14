"use client";

/**
 * NodeCardHeader Component
 *
 * Displays the header section of a Canvas node card:
 * - Node type icon with colored background
 * - Node title
 * - Children count badge (if applicable)
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CanvasNode } from "../canvas-data";

interface NodeTypeConfig {
  emoji: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NodeCardHeaderProps {
  node: CanvasNode;
  config: NodeTypeConfig;
}

export function NodeCardHeader({ node, config }: NodeCardHeaderProps) {
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-2 mb-3">
      <div
        className={cn(
          "p-2 rounded-lg shrink-0",
          config.color.replace("bg-", "bg-") + "/10"
        )}
      >
        <Icon className={cn("h-4 w-4", config.color.replace("bg-", "text-"))} />
      </div>

      <div className="flex-1 min-w-0 pr-20">
        <h3 className="font-medium text-sm leading-snug mb-1">{node.title}</h3>
        {node.children && node.children.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className="text-[10px] font-normal bg-primary/5 text-primary border-primary/20"
            >
              {node.children.length} children
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
