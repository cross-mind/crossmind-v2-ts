/**
 * Canvas Node Operations Hook
 * Handles node operations: delete, move to zone, hide, restore
 */

import { useCallback } from "react";
import { mutate as globalMutate } from "swr";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import { canvasApi, ApiError } from "@/lib/api/canvas-api";

interface UseCanvasNodeOperationsProps {
  projectId: string | null;
  currentFramework: ThinkingFramework | null;
  nodeContents: any[]; // NodeContent[] from canvas-data
  selectedNode: CanvasNode | null;
  onSetSelectedNode: (node: CanvasNode | null) => void;
  onSetShowAIChat: (show: boolean) => void;
  onUpdateUrl: (nodeId: string | null) => void;
  mutateNodes: () => Promise<void>;
  updateAffinity: (nodeId: string, affinities: Record<string, number>) => Promise<void>;
}

export function useCanvasNodeOperations({
  projectId,
  currentFramework,
  nodeContents,
  selectedNode,
  onSetSelectedNode,
  onSetShowAIChat,
  onUpdateUrl,
  mutateNodes,
  updateAffinity,
}: UseCanvasNodeOperationsProps) {
  /**
   * Delete a node and its children
   */
  const handleDelete = useCallback(
    async (node: CanvasNode) => {
      if (!confirm(`确定要删除节点"${node.title}"吗？这将同时删除其所有子节点。`)) {
        return;
      }

      // Close panel if the deleted node was selected
      if (selectedNode?.id === node.id) {
        onSetSelectedNode(null);
        onSetShowAIChat(false);
        onUpdateUrl(null); // Clear URL when selected node is deleted
      }

      try {
        // Call API first
        await canvasApi.nodes.delete(node.id);

        // Revalidate to get fresh data from server
        // Layout logic will handle preserving positions of remaining nodes
        await mutateNodes();
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("Delete API error:", error.message, error.status);
        } else {
          console.error("Error deleting node:", error);
        }
        alert("删除节点失败，请重试");
      }
    },
    [selectedNode, onSetSelectedNode, onSetShowAIChat, onUpdateUrl, mutateNodes]
  );

  /**
   * Move node to a different zone
   */
  const handleMoveToZone = useCallback(
    async (node: CanvasNode, targetZoneKey: string) => {
      if (!currentFramework) {
        console.error("[MoveToZone] No framework selected");
        return;
      }

      try {
        console.log("[MoveToZone] Moving node to zone", {
          nodeId: node.id,
          nodeTitle: node.title,
          targetZoneKey,
          frameworkId: currentFramework.id,
        });

        // Create new affinities: target zone = 1, all others = 0
        const newAffinities: Record<string, number> = {};
        currentFramework.zones.forEach((zone) => {
          newAffinities[zone.zoneKey] = zone.zoneKey === targetZoneKey ? 1 : 0;
        });

        // Update affinity in database
        await updateAffinity(node.id, newAffinities);

        console.log("[MoveToZone] Successfully moved node", {
          nodeId: node.id,
          newAffinities,
        });

        // Revalidate both canvas data and affinities to trigger layout recalculation
        if (projectId) {
          await mutateNodes();
          // Also revalidate affinities
          await globalMutate(
            `/api/canvas/affinities?projectId=${projectId}&frameworkId=${currentFramework.id}`
          );
        }
      } catch (error) {
        console.error("[MoveToZone] Failed to move node:", error);
        alert("移动节点失败，请重试");
      }
    },
    [currentFramework, projectId, updateAffinity, mutateNodes]
  );

  /**
   * Hide a node in the current framework
   */
  const handleHideNode = useCallback(
    async (node: CanvasNode) => {
      if (!currentFramework?.id) {
        console.error("[HideNode] No framework selected");
        return;
      }

      try {
        console.log("[HideNode] Hiding node", {
          nodeId: node.id,
          nodeTitle: node.title,
          frameworkId: currentFramework.id,
        });

        await canvasApi.nodes.hide(node.id, currentFramework.id);

        console.log("[HideNode] Successfully hidden node");

        // Revalidate to update UI
        if (projectId) {
          const swrKey = `/api/canvas?projectId=${projectId}`;
          await globalMutate(swrKey);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("[HideNode] API error:", error.message, error.status);
        } else {
          console.error("[HideNode] Failed to hide node:", error);
        }
        alert("隐藏节点失败，请重试");
      }
    },
    [currentFramework, projectId]
  );

  /**
   * Restore a hidden node
   */
  const handleRestoreNode = useCallback(
    async (nodeId: string) => {
      if (!currentFramework?.id) {
        console.error("[RestoreNode] No framework selected");
        return;
      }

      const node = nodeContents.find((n) => n.id === nodeId);
      if (!node) {
        console.error("[RestoreNode] Node not found");
        return;
      }

      try {
        console.log("[RestoreNode] Restoring node", {
          nodeId,
          nodeTitle: node.title,
          frameworkId: currentFramework.id,
        });

        await canvasApi.nodes.restore(nodeId, currentFramework.id);

        console.log("[RestoreNode] Successfully restored node");

        // Revalidate to update UI
        if (projectId) {
          const swrKey = `/api/canvas?projectId=${projectId}`;
          await globalMutate(swrKey);
        }
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("[RestoreNode] API error:", error.message, error.status);
        } else {
          console.error("[RestoreNode] Failed to restore node:", error);
        }
        alert("恢复节点失败，请重试");
      }
    },
    [currentFramework, projectId, nodeContents]
  );

  return {
    handleDelete,
    handleMoveToZone,
    handleHideNode,
    handleRestoreNode,
  };
}
