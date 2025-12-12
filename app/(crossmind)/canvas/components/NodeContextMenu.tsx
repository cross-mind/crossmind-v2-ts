"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import type { CanvasNode } from "../canvas-data";

interface NodeContextMenuProps {
  node: CanvasNode;
  children: React.ReactNode;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (node: CanvasNode) => void;
  onDelete: (node: CanvasNode) => void;
}

export function NodeContextMenu({
  node,
  children,
  onOpenAIChat,
  onAddChild,
  onDelete,
}: NodeContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onOpenAIChat(node);
          }}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          <span>CrossMind</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>Add Child</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node);
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
