/**
 * Canvas Drag-Drop Hook
 * 核心拖放逻辑
 */
"use client";

import { useState, useCallback } from "react";
import { useSensors, useSensor, PointerSensor, type DragStartEvent, type DragEndEvent, type DragOverEvent, type DragMoveEvent } from "@dnd-kit/core";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import { calculateNewDisplayOrder, calculateDropPosition, isDescendant, type DropPosition } from "../lib/drag-drop-helpers";
import { toast } from "sonner";
import { mutate } from "swr";

export function useCanvasDragDrop({
  nodes,
  projectId,
  currentFramework,
  updateAffinity,
}: {
  nodes: CanvasNode[];
  projectId: string;
  currentFramework: ThinkingFramework | null;
  updateAffinity: (nodeId: string, affinities: Record<string, number>) => Promise<void>;
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

    const overId = over.id as string;
    const newPosition = calculateDropPosition(event, overId);

    // 调试：记录所有 over 事件，特别是 zone 相关的
    if (overId.startsWith('zone-')) {
      console.log('[DragPosition] Over ZONE:', {
        zoneId: overId,
        position: newPosition,
      });
    }

    setOverNodeId(overId);
    setDropPosition(newPosition);
  }, []);

  // onDragOver: 当悬停目标改变时触发
  const handleDragOver = updateDropPosition;

  // onDragMove: 拖动过程中持续触发，实现实时位置更新
  const handleDragMove = updateDropPosition;

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!activeNodeId || !currentFramework) {
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

      // 检查是否拖到了 zone 区域
      const overIdStr = over.id as string;
      if (overIdStr.startsWith("zone-")) {
        const zoneId = overIdStr.replace("zone-", "");

        try {
          console.log("[DragDrop] Dropped on zone:", {
            nodeId: draggedNode.id,
            nodeTitle: draggedNode.title,
            zoneId,
            frameworkId: currentFramework.id,
            activeRect: event.active.rect?.current,
          });

          // Find the zone by ID to get its zoneKey
          const targetZone = currentFramework.zones.find(z => z.id === zoneId);
          if (!targetZone) {
            console.error("[DragDrop] Target zone not found:", zoneId);
            throw new Error("Target zone not found");
          }

          // Build new affinities using zoneKey (stable identifier)
          // Set target zone weight to 1.0, all other zones to 0
          const newAffinities: Record<string, number> = {};
          currentFramework.zones.forEach(zone => {
            newAffinities[zone.zoneKey] = zone.id === zoneId ? 1.0 : 0;
          });

          // 找到该 zone 中所有根节点（排除被拖动的节点自己）
          const zoneNodes = nodes.filter(n => {
            if (n.id === draggedNode.id) return false;
            if (n.parentId) return false;

            // 检查节点是否属于这个 zone
            const affinities = n.zoneAffinities?.[currentFramework.id] as Record<string, number> | undefined;
            if (affinities) {
              // 找到权重最高的 zone
              let bestZone = Object.keys(affinities)[0];
              let maxWeight = affinities[bestZone] || 0;
              for (const [zone, weight] of Object.entries(affinities)) {
                if (weight > maxWeight) {
                  maxWeight = weight;
                  bestZone = zone;
                }
              }
              return bestZone === zoneId;
            }

            // 如果没有 affinities，使用 fallback 逻辑（基于 displayOrder）
            const displayOrder = n.displayOrder ?? 0;
            const zoneCount = currentFramework.zones.length;
            const assignedZoneIndex = Math.abs(Math.floor(displayOrder / 10000)) % zoneCount;
            const assignedZone = currentFramework.zones[assignedZoneIndex];
            if (!assignedZone) return false; // Safety check
            const assignedZoneId = assignedZone.id;
            return assignedZoneId === zoneId;
          });

          // 按 displayOrder 排序
          zoneNodes.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

          // 计算新的 displayOrder
          let newDisplayOrder: number;

          if (zoneNodes.length === 0) {
            // Zone 为空，使用该 zone 的基础 displayOrder
            // 根据当前框架中该 zone 的位置计算 displayOrder
            const zoneIndex = currentFramework.zones.findIndex(z => z.id === zoneId);
            newDisplayOrder = (zoneIndex >= 0 ? zoneIndex : 0) * 10000 + 5000; // 放在 zone 中间
          } else {
            // 获取拖动位置的 Y 坐标（绝对坐标）
            const dropY = event.active.rect?.current?.translated?.top || 0;

            // 找到最接近的节点（使用实际 DOM 位置）
            let closestNode = zoneNodes[0];
            let minDistance = Infinity;
            let insertBefore = true;

            for (const node of zoneNodes) {
              // 从 DOM 获取节点的实际位置
              const nodeElement = document.querySelector(`[data-node-id="${node.id}"]`);
              if (!nodeElement) {
                // 如果节点不存在于 DOM 中，使用默认的 displayOrder 顺序
                continue;
              }

              const rect = nodeElement.getBoundingClientRect();
              const nodeY = rect.top; // 使用实际的屏幕 Y 坐标
              const distance = Math.abs(nodeY - dropY);

              if (distance < minDistance) {
                minDistance = distance;
                closestNode = node;
                insertBefore = dropY < nodeY;
              }
            }

            // 如果没有找到任何节点元素，使用第一个节点作为插入位置
            if (minDistance === Infinity) {
              closestNode = zoneNodes[0];
              insertBefore = true;
            }

            // 根据位置计算新的 displayOrder
            if (insertBefore) {
              // 插入到 closestNode 之前
              const prevNode = zoneNodes[zoneNodes.indexOf(closestNode) - 1];
              if (prevNode) {
                newDisplayOrder = ((prevNode.displayOrder || 0) + (closestNode.displayOrder || 0)) / 2;
              } else {
                newDisplayOrder = (closestNode.displayOrder || 0) - 1000;
              }
            } else {
              // 插入到 closestNode 之后
              const nextNode = zoneNodes[zoneNodes.indexOf(closestNode) + 1];
              if (nextNode) {
                newDisplayOrder = ((closestNode.displayOrder || 0) + (nextNode.displayOrder || 0)) / 2;
              } else {
                newDisplayOrder = (closestNode.displayOrder || 0) + 1000;
              }
            }
          }

          console.log("[DragDrop] Calculated displayOrder:", {
            zoneNodesCount: zoneNodes.length,
            newDisplayOrder,
          });

          // Update affinity using new API
          console.log("[DragDrop] Updating affinities:", {
            nodeId: draggedNode.id,
            affinities: newAffinities,
          });
          await updateAffinity(draggedNode.id, newAffinities);
          console.log("[DragDrop] Affinity update successful");

          // Update displayOrder and parentId separately
          const response = await fetch(`/api/canvas/${draggedNode.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayOrder: newDisplayOrder,
              parentId: null, // 确保变成根节点
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error("[DragDrop] API error:", error);
            throw new Error("Failed to update node position");
          }

          toast.success(`Moved to ${targetZone.name}`);
          await mutate(`/api/canvas?projectId=${projectId}`);
        } catch (error) {
          console.error("Drag drop error:", error);
          toast.error("Failed to move to zone");
        } finally {
          setActiveNodeId(null);
          setOverNodeId(null);
          setDropPosition(null);
        }
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

          // 检查目标节点的 zone affinity
          const targetNodeAffinities = targetNode.zoneAffinities?.[currentFramework.id] as Record<string, number> | undefined;
          let targetZoneId: string | null = null;

          if (targetNodeAffinities && targetNode.parentId === null) {
            // 目标节点是根节点，找到它的主要 zone
            let maxWeight = 0;
            for (const [zoneKey, weight] of Object.entries(targetNodeAffinities)) {
              if (weight > maxWeight) {
                maxWeight = weight;
                targetZoneId = zoneKey;
              }
            }
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

          // 如果目标节点在某个 zone 中，且拖动的节点也是根节点，则同步 zone affinity
          if (targetZoneId && draggedNode.parentId === null) {
            // Build new affinities using zoneKey
            const newAffinities: Record<string, number> = {};
            currentFramework.zones.forEach(zone => {
              newAffinities[zone.zoneKey] = zone.id === targetZoneId ? 1.0 : 0;
            });

            try {
              // Update affinity first
              await updateAffinity(draggedNode.id, newAffinities);
              console.log("[DragDrop] Updated affinity to match target node's zone:", targetZoneId);
            } catch (error) {
              console.error("[DragDrop] Failed to update affinity:", error);
              // Continue with position update even if affinity update fails
            }
          }
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
    [activeNodeId, dropPosition, nodes, projectId, currentFramework]
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
