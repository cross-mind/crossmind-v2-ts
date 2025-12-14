"use client";

/**
 * NodeDetailHeader Component
 *
 * Displays the header section of the NodeDetailPanel with:
 * - Node type icon and color
 * - Node title and tags
 * - Document/AI Chat tab switcher
 * - Close button
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, FileText, Bot } from "lucide-react";
import type { CanvasNode } from "../canvas-data";

interface NodeTypeConfig {
  emoji: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NodeDetailHeaderProps {
  selectedNode: CanvasNode;
  nodeTypeConfig: NodeTypeConfig;
  showAIChat: boolean;
  onSetShowAIChat: (show: boolean) => void;
  onClose: () => void;
}

export function NodeDetailHeader({
  selectedNode,
  nodeTypeConfig,
  showAIChat,
  onSetShowAIChat,
  onClose,
}: NodeDetailHeaderProps) {
  const Icon = nodeTypeConfig.icon;

  return (
    <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/10">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            nodeTypeConfig.color.replace("bg-", "bg-") + "/10"
          )}
        >
          <Icon
            className={cn("h-4 w-4", nodeTypeConfig.color.replace("bg-", "text-"))}
          />
        </div>
        <div>
          <h2 className="font-semibold text-sm">{selectedNode.title}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[10px]">
              {nodeTypeConfig.emoji} {nodeTypeConfig.label}
            </Badge>
            {selectedNode.tags?.slice(0, 2).map((tag) => {
              const [, value] = tag.split("/");
              return (
                <span key={tag} className="text-[10px] text-muted-foreground">
                  #{value}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Button
            variant={!showAIChat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => onSetShowAIChat(false)}
          >
            <FileText className="h-3 w-3 mr-1" />
            Document
          </Button>
          <Button
            variant={showAIChat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => onSetShowAIChat(true)}
          >
            <Bot className="h-3 w-3 mr-1" />
            AI Chat
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
