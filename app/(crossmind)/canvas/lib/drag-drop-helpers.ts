/**
 * Drag-Drop Helper Functions
 * 用于 Canvas 节点拖放功能的辅助函数
 */

import type { CanvasNode } from "../canvas-data";

/**
 * 计算新的 displayOrder 值（插入到两个节点之间）
 * 使用浮点数策略避免批量更新
 */
export function calculateNewDisplayOrder(
  sortedNodes: CanvasNode[],
  targetNode: CanvasNode,
  insertBefore: boolean
): number {
  const targetIndex = sortedNodes.findIndex((n) => n.id === targetNode.id);

  // Handle case when target node is not in the sorted list (e.g., was filtered out)
  if (targetIndex === -1) {
    if (sortedNodes.length === 0) {
      return 1000;
    }
    // Insert relative to the first or last node
    if (insertBefore) {
      return (sortedNodes[0].displayOrder || 0) - 1000;
    } else {
      return (sortedNodes[sortedNodes.length - 1].displayOrder || 0) + 1000;
    }
  }

  if (insertBefore) {
    // 插入到目标节点前面
    if (targetIndex === 0) {
      // 插入到最前面
      return (targetNode.displayOrder || 0) - 1000;
    }
    const prevOrder = sortedNodes[targetIndex - 1].displayOrder || 0;
    const targetOrder = targetNode.displayOrder || 0;
    return (prevOrder + targetOrder) / 2;
  } else {
    // 插入到目标节点后面
    if (targetIndex === sortedNodes.length - 1) {
      // 插入到最后面
      return (targetNode.displayOrder || 0) + 1000;
    }
    const targetOrder = targetNode.displayOrder || 0;
    const nextOrder = sortedNodes[targetIndex + 1].displayOrder || 0;
    return (targetOrder + nextOrder) / 2;
  }
}

/**
 * 检查是否是后代节点（防止循环引用）
 */
export function isDescendant(
  ancestor: CanvasNode,
  potentialDescendant: CanvasNode,
  allNodes: CanvasNode[]
): boolean {
  let current: CanvasNode | undefined = potentialDescendant;
  const visited = new Set<string>();

  while (current && current.parentId) {
    if (visited.has(current.id)) {
      // 防止死循环
      return false;
    }
    if (current.parentId === ancestor.id) {
      return true;
    }
    visited.add(current.id);
    current = allNodes.find((n) => n.id === current?.parentId);
  }

  return false;
}

/**
 * 更新区域归属（仅更新当前框架）
 */
export function updateZoneAffinities(
  node: CanvasNode,
  newZoneId: string,
  frameworkId: string
): Record<string, Record<string, number>> {
  return {
    ...(node.zoneAffinities || {}),
    [frameworkId]: {
      ...((node.zoneAffinities as Record<string, Record<string, number>> | undefined)?.[frameworkId] || {}),
      [newZoneId]: 10, // 最高权重，确保节点留在新区域
    },
  };
}

/**
 * 判断拖放位置类型
 */
export type DropPosition = "top" | "bottom" | "center" | null;

export function calculateDropPosition(
  event: any,
  overNodeId: string
): DropPosition {
  const overElement = document.querySelector(`[data-node-id="${overNodeId}"]`);
  if (!overElement) return null;

  const rect = overElement.getBoundingClientRect();

  // Get current mouse position from active pointer
  // event.active.rect.current.translated contains current drag position
  // But we need the actual pointer position, which is in the event itself
  let mouseY: number | undefined;

  // Try to get from delta (current position during drag)
  if (event.delta && event.activatorEvent) {
    // Calculate current Y position: initial Y + accumulated delta
    mouseY = event.activatorEvent.clientY + event.delta.y;
  } else if (event.activatorEvent?.clientY !== undefined) {
    // Fallback: use activator event (less accurate, but better than nothing)
    mouseY = event.activatorEvent.clientY;
  }

  if (!mouseY) return null;

  const relativeY = (mouseY - rect.top) / rect.height;

  // 25% zones for top/bottom, 50% zone for center
  if (relativeY < 0.25) {
    return "top";
  } else if (relativeY > 0.75) {
    return "bottom";
  } else {
    return "center";
  }
}

/**
 * 精度耗尽检测
 */
export const ORDER_THRESHOLD = 0.001;

export function needsRebalance(
  newOrder: number,
  existingNodes: CanvasNode[]
): boolean {
  return existingNodes.some(
    (node) =>
      node.displayOrder !== undefined &&
      Math.abs((node.displayOrder || 0) - newOrder) < ORDER_THRESHOLD
  );
}
