/**
 * Canvas Drag-Drop Hook
 * 核心拖放逻辑
 */
"use client";

import { useState, useCallback } from "react";
import { useSensors, useSensor, PointerSensor, type DragStartEvent, type DragEndEvent, type DragOverEvent, type DragMoveEvent } from "@dnd-kit/core";
import type { CanvasNode } from "../canvas-data";
import { calculateNewDisplayOrder, calculateDropPosition, isDescendant, type DropPosition } from "../lib/drag-drop-helpers";
import { toast } from "sonner";
import { mutate } from "swr";

export function useCanvasDragDrop({
  nodes,
  projectId,
  currentFrameworkId,
}: {
  nodes: CanvasNode[];
  projectId: string;
  currentFrameworkId: string;
}) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [overNodeId, setOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);

  // 配置传感器 (8px 移动后才触发拖动)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveNodeId(event.active.id as string);
  }, []);

  // 通用位置检测函数 - 同时用于 onDragOver 和 onDragMove
  const updateDropPosition = useCallback((event: DragOverEvent | DragMoveEvent) => {
    const { over } = event;
    if (!over) {
      setOverNodeId(null);
      setDropPosition(null);
      return;
    }

    const newPosition = calculateDropPosition(event, over.id as string);
    console.log('[DragPosition] Position updated:', {
      overNode: over.id,
      position: newPosition,
      deltaY: event.delta?.y
    });

    setOverNodeId(over.id as string);
    setDropPosition(newPosition);
  }, []);

  // onDragOver: 当悬停目标改变时触发
  const handleDragOver = updateDropPosition;

  // onDragMove: 拖动过程中持续触发，实现实时位置更新
  const handleDragMove = updateDropPosition;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!activeNodeId) {
        return;
      }

      const draggedNode = nodes.find((n) => n.id === active.id);

      if (!draggedNode) {
        setActiveNodeId(null);
        setOverNodeId(null);
        setDropPosition(null);
        return;
      }

      // 特殊情况：拖到空白区域（没有 over 目标）
      // 如果是子节点，则脱离父节点变成根节点
      if (!over) {
        if (draggedNode.parentId) {
          try {
            console.log("[DragDrop] Detaching node from parent:", {
              nodeId: draggedNode.id,
              nodeTitle: draggedNode.title,
              oldParentId: draggedNode.parentId,
            });

            // 变成根节点
            const response = await fetch(`/api/canvas/${draggedNode.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ parentId: null }),
            });

            if (!response.ok) {
              const error = await response.json();
              console.error("[DragDrop] API error:", error);
              throw new Error("Failed to detach node");
            }

            toast.success("Node detached from parent");
            await mutate(`/api/canvas?projectId=${projectId}`);
          } catch (error) {
            console.error("Drag drop error:", error);
            toast.error("Failed to detach node");
          }
        }

        setActiveNodeId(null);
        setOverNodeId(null);
        setDropPosition(null);
        return;
      }

      const targetNode = nodes.find((n) => n.id === over.id);

      if (!targetNode || draggedNode.id === targetNode.id) {
        setActiveNodeId(null);
        setOverNodeId(null);
        setDropPosition(null);
        return;
      }

      try {
        let updates: any = {};

        if (dropPosition === "center") {
          // 成为子节点
          if (isDescendant(draggedNode, targetNode, nodes)) {
            toast.error("Cannot create circular hierarchy");
            setActiveNodeId(null);
            setOverNodeId(null);
            setDropPosition(null);
            return;
          }

          // 找出目标节点的所有现有子节点，计算新的 displayOrder
          const existingChildren = nodes.filter((n) => n.parentId === targetNode.id);
          const maxChildOrder = existingChildren.length > 0
            ? Math.max(...existingChildren.map((n) => n.displayOrder || 0))
            : 0;

          updates = {
            parentId: targetNode.id,
            displayOrder: maxChildOrder + 1000,
          };
        } else if (dropPosition === "top" || dropPosition === "bottom") {
          // 排序调整 - 插入到目标节点的前面或后面

          // 关键检查：防止父节点被拖到自己的子孙节点之间
          // 如果 targetNode 是 draggedNode 的后代，则拒绝操作
          if (isDescendant(targetNode, draggedNode, nodes)) {
            toast.error("Cannot move a parent node among its children");
            setActiveNodeId(null);
            setOverNodeId(null);
            setDropPosition(null);
            return;
          }

          // Get all nodes at the same level (including target node, excluding dragged node)
          const sameParent = nodes.filter(
            (n) => n.parentId === targetNode.parentId && n.id !== draggedNode.id
          );
          const sorted = sameParent.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
          const newOrder = calculateNewDisplayOrder(sorted, targetNode, dropPosition === "top");

          updates = {
            parentId: targetNode.parentId || null,
            displayOrder: newOrder,
          };
        }

        console.log("[DragDrop] Updating node:", {
          nodeId: draggedNode.id,
          nodeTitle: draggedNode.title,
          updates,
          dropPosition,
        });

        // 调用 API 更新（只更新一个节点）
        const response = await fetch(`/api/canvas/${draggedNode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("[DragDrop] API error:", error);
          throw new Error("Failed to update node");
        }

        toast.success("Node moved");

        // 使用 SWR mutate 触发数据重新获取，而不是刷新页面
        await mutate(`/api/canvas?projectId=${projectId}`);

      } catch (error) {
        console.error("Drag drop error:", error);
        toast.error("Failed to move node");
      } finally {
        setActiveNodeId(null);
        setOverNodeId(null);
        setDropPosition(null);
      }
    },
    [activeNodeId, dropPosition, nodes, projectId]
  );

  return {
    sensors,
    activeNodeId,
    overNodeId,
    dropPosition,
    handleDragStart,
    handleDragOver,
    handleDragMove,
    handleDragEnd,
  };
}
