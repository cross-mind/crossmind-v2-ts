/**
 * Draggable Node Wrapper
 * 使节点可拖动的包装组件
 */
"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasNode } from "../canvas-data";

export function DraggableNode({
  node,
  children,
  isDragOver,
  dropPosition,
}: {
  node: CanvasNode;
  children: React.ReactNode;
  isDragOver?: boolean;
  dropPosition?: "top" | "bottom" | "center" | null;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    data: { node },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: node.id,
    data: { node },
  });

  // 合并 refs
  const setRefs = (element: HTMLDivElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <div
      ref={setRefs}
      data-node-id={node.id}
      className={cn(
        "relative group",
        isDragging && "opacity-50 scale-95 transition-all",
        isDragOver && dropPosition === "center" && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* 拖动手柄 */}
      <div
        {...listeners}
        {...attributes}
        className={cn(
          "absolute left-2 top-2 z-10",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "cursor-grab active:cursor-grabbing",
          "p-1 rounded bg-muted/50 hover:bg-muted"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {children}
    </div>
  );
}
