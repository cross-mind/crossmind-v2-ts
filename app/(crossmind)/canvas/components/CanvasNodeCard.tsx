"use client";

import { cn } from "@/lib/utils";
import React from "react";
import { HealthPopover } from "./HealthPopover";
import { NodeHealthBadge } from "./NodeHealthBadge";
import { DropIndicator } from "./DropIndicator";
import { NodeContextMenu } from "./NodeContextMenu";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { NodeSuggestionBadge } from "./NodeSuggestionBadge";
import { SuggestionPopover } from "./SuggestionPopover";
import { NodeCardHeader } from "./NodeCardHeader";
import { NodeCardTypeContent } from "./NodeCardTypeContent";
import { NodeCardTags } from "./NodeCardTags";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import type { CanvasSuggestion } from "@/lib/db/schema";

// 子节点卡片组件（支持拖放）
function ChildNodeCard({
  child,
  childConfig,
  grandChildren,
  currentFramework,
  onNodeClick,
  onOpenAIChat,
  onAddChild,
  onDelete,
  onMoveToZone,
  onHideNode,
  overNodeId,
  dropPosition,
}: {
  child: CanvasNode;
  childConfig: NodeTypeConfig;
  grandChildren: CanvasNode[];
  currentFramework?: ThinkingFramework | null;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (node: CanvasNode) => void;
  onDelete: (node: CanvasNode) => void;
  onMoveToZone?: (node: CanvasNode, zoneKey: string) => void;
  onHideNode?: (node: CanvasNode) => void;
  overNodeId?: string | null;
  dropPosition?: "top" | "bottom" | "center" | null;
}) {
  // 子节点也可以被拖动
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: child.id,
    data: { node: child },
  });

  // 子节点也可以作为拖放目标
  const { setNodeRef: setDropRef } = useDroppable({
    id: child.id,
    data: { node: child },
  });

  // 合并 refs
  const setRefs = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const isChildDragOver = overNodeId === child.id;

  return (
    <div className="relative">
      {/* Drop indicators for child nodes */}
      <DropIndicator position="top" isActive={isChildDragOver && dropPosition === "top"} />
      <DropIndicator position="bottom" isActive={isChildDragOver && dropPosition === "bottom"} />

      <NodeContextMenu
        node={child}
        currentFramework={currentFramework}
        onOpenAIChat={onOpenAIChat}
        onAddChild={onAddChild}
        onDelete={onDelete}
        onMoveToZone={onMoveToZone}
        onHideNode={onHideNode}
      >
        <div
          ref={setRefs}
          data-node-id={child.id}
          {...listeners}
          {...attributes}
          className={cn(
            "flex items-center gap-2 py-1 px-2 -ml-4 pl-6 rounded-lg cursor-grab active:cursor-grabbing group/child transition-all",
            // 移除拖动时的缩放和半透明效果
            isDragging && "cursor-grabbing",
            isChildDragOver && dropPosition === "center" && "ring-2 ring-primary ring-offset-1 bg-primary/5",
            !isDragging && !isChildDragOver && "hover:bg-muted/50"
          )}
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
      </NodeContextMenu>
    </div>
  );
}

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
  currentFramework?: ThinkingFramework | null;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (node: CanvasNode) => void;
  onDelete: (node: CanvasNode) => void;
  onMoveToZone?: (node: CanvasNode, zoneKey: string) => void;
  onHideNode?: (node: CanvasNode) => void;
  onNodeRefSet: (id: string, el: HTMLDivElement | null) => void;
  matchesFilter: (node: CanvasNode) => boolean;
  stageFilter: string;
  // Drag-drop props
  overNodeId?: string | null;
  dropPosition?: "top" | "bottom" | "center" | null;
  // Suggestions
  nodeSuggestions: CanvasSuggestion[];
  onApplySuggestion: (suggestionId: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

export function CanvasNodeCard({
  node,
  visibleNodes,
  selectedNodeId,
  nodeTypeConfig,
  currentFramework,
  onNodeClick,
  onOpenAIChat,
  onAddChild,
  onDelete,
  onMoveToZone,
  onHideNode,
  onNodeRefSet,
  matchesFilter,
  stageFilter,
  overNodeId,
  dropPosition,
  nodeSuggestions,
  onApplySuggestion,
  onDismissSuggestion,
}: CanvasNodeCardProps) {
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;
  const isMatching = matchesFilter(node);
  const isHighlighted = stageFilter === "all" || isMatching;

  const isDragOver = overNodeId === node.id;

  // Drag-drop hooks
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: { node },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { node },
  });

  // Merge refs for both drag and drop
  const setCardRef = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
    onNodeRefSet(node.id, el);
  };

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

              <ChildNodeCard
                child={child}
                childConfig={childConfig}
                grandChildren={grandChildren}
                currentFramework={currentFramework}
                onNodeClick={onNodeClick}
                onOpenAIChat={onOpenAIChat}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onMoveToZone={onMoveToZone}
                onHideNode={onHideNode}
                overNodeId={overNodeId}
                dropPosition={dropPosition}
              />

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
      <NodeContextMenu
        node={node}
        currentFramework={currentFramework}
        onOpenAIChat={onOpenAIChat}
        onAddChild={onAddChild}
        onDelete={onDelete}
        onMoveToZone={onMoveToZone}
        onHideNode={onHideNode}
      >
        <div
          ref={setCardRef}
          data-node-id={node.id}
          {...listeners}
          {...attributes}
          className={cn(
            "absolute w-80 p-4 bg-background border-2 rounded-xl shadow-sm group select-none cursor-grab active:cursor-grabbing",
            "transition-all duration-300 ease-out",
            selectedNodeId === node.id
              ? "border-primary shadow-lg scale-105 z-10"
              : isHighlighted
                ? "border-border hover:border-primary/50 hover:shadow-md"
                : "border-border/30 opacity-40 hover:opacity-60",
            // 移除拖动时的缩放和半透明效果，只保留 cursor
            isDragging && "cursor-grabbing",
            // Enhanced visual feedback for drop positions
            isDragOver && dropPosition === "center" && "ring-4 ring-primary ring-offset-2 bg-primary/5",
            isDragOver && dropPosition === "top" && "border-t-4 border-t-primary",
            isDragOver && dropPosition === "bottom" && "border-b-4 border-b-primary"
          )}
          style={{
            left: node.position?.x ?? -9999,
            top: node.position?.y ?? -9999,
            userSelect: "none",
          }}
          onClick={(e) => onNodeClick(node, e)}
        >
        {/* Drop indicators for parent nodes */}
        <DropIndicator position="top" isActive={isDragOver === true && dropPosition === "top"} />
        <DropIndicator position="bottom" isActive={isDragOver === true && dropPosition === "bottom"} />
        {/* Suggestion Badge with Popover - positioned to avoid title overlap */}
        {nodeSuggestions.length > 0 && (
          <SuggestionPopover
            suggestions={nodeSuggestions}
            onApply={onApplySuggestion}
            onDismiss={onDismissSuggestion}
          >
            <div className={cn(
              "absolute top-2",
              // Position based on whether health badge exists
              node.healthScore !== undefined ? "right-[72px]" : "right-2"
            )}>
              <NodeSuggestionBadge count={nodeSuggestions.length} />
            </div>
          </SuggestionPopover>
        )}

        {/* Health Badge - always at right-2 */}
        <NodeHealthBadge node={node} />

        {/* Header */}
        <NodeCardHeader node={node} config={config} />

        {/* Type-specific content */}
        <NodeCardTypeContent node={node} />

        {/* Content Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {node.content.replace(/[#*]/g, "").trim()}
        </p>

        {/* Nested Children */}
        {renderChildren(node.id)}

        {/* Tags */}
        <NodeCardTags node={node} />

        </div>
      </NodeContextMenu>
    </HealthPopover>
  );
}
