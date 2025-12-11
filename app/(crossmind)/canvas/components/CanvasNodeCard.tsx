"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import React from "react";
import { HealthPopover } from "./HealthPopover";
import { NodeHealthBadge } from "./NodeHealthBadge";
import type { CanvasNode } from "../canvas-data";

interface NodeTypeConfig {
  emoji: string;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CanvasNodeCardProps {
  node: CanvasNode;
  visibleNodes: CanvasNode[];
  selectedNodeId: string | null;
  nodeTypeConfig: Record<string, NodeTypeConfig>;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (node: CanvasNode) => void;
  onNodeRefSet: (id: string, el: HTMLDivElement | null) => void;
  matchesFilter: (node: CanvasNode) => boolean;
  stageFilter: string;
}

export function CanvasNodeCard({
  node,
  visibleNodes,
  selectedNodeId,
  nodeTypeConfig,
  onNodeClick,
  onOpenAIChat,
  onAddChild,
  onNodeRefSet,
  matchesFilter,
  stageFilter,
}: CanvasNodeCardProps) {
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;
  const isMatching = matchesFilter(node);
  const isHighlighted = stageFilter === "all" || isMatching;

  // Recursive function to render child nodes as nested tree items
  const renderChildren = (parentId: string, level: number = 1): React.ReactNode => {
    const children = visibleNodes.filter((n) => n.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className="">
        {children.map((child, index) => {
          const childConfig = nodeTypeConfig[child.type];
          const grandChildren = visibleNodes.filter((n) => n.parentId === child.id);
          const isLast = index === children.length - 1;

          return (
            <div key={child.id} className="relative pl-6">
              {/* Tree connector lines */}
              <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none">
                {/* Vertical line connecting siblings */}
                {!isLast && (
                  <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
                )}
                {/* L-shaped connector */}
                <div className="absolute left-[11px] top-0 w-px h-[13px] bg-border" />
                <div className="absolute left-[11px] top-[12px] w-[13px] h-px bg-border" />
              </div>

              <div
                className="flex items-center gap-2 py-1 px-2 -ml-4 pl-6 rounded-lg hover:bg-muted/50 cursor-pointer group/child transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onNodeClick(child, e);
                }}
              >
                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", childConfig.color)} />
                <span className="text-xs font-medium flex-1 truncate">{child.title}</span>
                {grandChildren.length > 0 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    +{grandChildren.length}
                  </span>
                )}
              </div>

              {/* Render grandchildren recursively */}
              {grandChildren.length > 0 && renderChildren(child.id, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <HealthPopover node={node}>
      <div
        ref={(el) => onNodeRefSet(node.id, el)}
        className={cn(
          "absolute w-80 p-4 bg-background border-2 rounded-xl shadow-sm cursor-pointer group select-none",
          "transition-all duration-300 ease-out",
          selectedNodeId === node.id
            ? "border-primary shadow-lg scale-105 z-10"
            : isHighlighted
              ? "border-border hover:border-primary/50 hover:shadow-md"
              : "border-border/30 opacity-40 hover:opacity-60",
        )}
        style={{
          left: node.position.x,
          top: node.position.y,
          userSelect: "none",
        }}
        onClick={(e) => onNodeClick(node, e)}
      >
        {/* Health Badge */}
        <NodeHealthBadge node={node} />

        {/* Header */}
        <div className="flex items-start gap-2 mb-3">
          <div
            className={cn(
              "p-2 rounded-lg shrink-0",
              config.color.replace("bg-", "bg-") + "/10",
            )}
          >
            <Icon className={cn("h-4 w-4", config.color.replace("bg-", "text-"))} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-snug mb-1">{node.title}</h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {config.emoji} {config.label}
              </Badge>
              {node.children && node.children.length > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal bg-primary/5 text-primary border-primary/20"
                >
                  {node.children.length} children
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Type-specific content */}
        {node.type === "task" && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-medium",
                  node.taskStatus === "done" && "bg-green-500/10 text-green-600",
                  node.taskStatus === "in-progress" &&
                    "bg-blue-500/10 text-blue-600",
                  node.taskStatus === "todo" && "bg-gray-500/10 text-gray-600",
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
                截止 {node.dueDate}
              </div>
            )}
          </div>
        )}

        {node.type === "idea" && (
          <div className="mb-3 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-500">
              💡 早期想法,待验证
            </p>
          </div>
        )}

        {node.type === "inspiration" && (
          <div className="mb-3 p-2 bg-pink-500/5 border border-pink-500/20 rounded-lg">
            <div className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 mb-1">
              <Sparkles className="h-3 w-3" />
              <span className="font-medium">Inspiration</span>
            </div>
            {node.source && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>📚 {node.source}</span>
              </div>
            )}
            {node.capturedAt && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                {node.capturedAt}
              </div>
            )}
          </div>
        )}

        {/* Content Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {node.content.replace(/[#*]/g, "").trim()}
        </p>

        {/* Nested Children */}
        {renderChildren(node.id)}

        {/* Tags */}
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {node.tags.slice(0, 3).map((tag) => {
              const [namespace, value] = tag.split("/");
              const tagColors: Record<string, string> = {
                type: "bg-blue-500/10 text-blue-600",
                stage: "bg-green-500/10 text-green-600",
                priority: "bg-orange-500/10 text-orange-600",
              };

              return (
                <div
                  key={tag}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                    tagColors[namespace] || "bg-muted text-muted-foreground",
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
        )}

        {/* Hover Actions */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1 bg-background border border-border rounded-lg shadow-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAIChat(node);
              }}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              CrossMind
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node);
              }}
            >
              Add Child
            </Button>
          </div>
        </div>
      </div>
    </HealthPopover>
  );
}
