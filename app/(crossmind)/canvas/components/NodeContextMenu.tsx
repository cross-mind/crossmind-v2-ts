"use client";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Sparkles, Plus, Trash2, MoveRight, EyeOff } from "lucide-react";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";

interface NodeContextMenuProps {
  node: CanvasNode;
  children: React.ReactNode;
  currentFramework?: ThinkingFramework | null;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (node: CanvasNode) => void;
  onDelete: (node: CanvasNode) => void;
  onMoveToZone?: (node: CanvasNode, zoneKey: string) => void;
  onHideNode?: (node: CanvasNode) => void;
}

export function NodeContextMenu({
  node,
  children,
  currentFramework,
  onOpenAIChat,
  onAddChild,
  onDelete,
  onMoveToZone,
  onHideNode,
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
          <span>Ask AI</span>
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

        {/* Move to Zone submenu */}
        {currentFramework && onMoveToZone && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <MoveRight className="mr-2 h-4 w-4" />
                <span>Move to Zone</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {currentFramework.zones.map((zone: ThinkingFramework["zones"][number]) => (
                  <ContextMenuItem
                    key={zone.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToZone(node, zone.zoneKey);
                    }}
                  >
                    <span className="truncate">{zone.name}</span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Hide in Framework */}
        {currentFramework && onHideNode && (
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onHideNode(node);
            }}
          >
            <EyeOff className="mr-2 h-4 w-4" />
            <span>Hide in this Framework</span>
          </ContextMenuItem>
        )}

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
