/**
 * Canvas Actions Hook
 * Handles all node-related actions (create, update, tag, comment)
 */

import { useState, useCallback } from "react";
import { mutate } from "swr";
import type { CanvasNode } from "../canvas-data";
import { createNodeAction, addCommentAction, updateNodeAction } from "../actions";
import type { ZoneInfo } from "./useZoneDetection";
import type { NodeType } from "../node-type-config";

interface UseCanvasActionsProps {
  projectId: string | null;
  nodes: CanvasNode[];
  currentFrameworkId?: string | null;
  onNodeCreated?: (nodeId: string) => void;
}

export function useCanvasActions({ projectId, nodes, currentFrameworkId, onNodeCreated }: UseCanvasActionsProps) {
  // Node Dialog state
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [nodeDialogParentId, setNodeDialogParentId] = useState<string | null>(null);

  // Quick Node Dialog state
  const [quickNodeDialogOpen, setQuickNodeDialogOpen] = useState(false);
  const [quickNodeZone, setQuickNodeZone] = useState<ZoneInfo | null>(null);

  // Tag Dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogNodeId, setTagDialogNodeId] = useState<string | null>(null);

  // Comment input state
  const [commentInput, setCommentInput] = useState("");

  /**
   * Handle adding a child node
   */
  const handleAddChild = useCallback((parentNode: CanvasNode) => {
    setNodeDialogParentId(parentNode.id);
    setNodeDialogOpen(true);
  }, []);

  /**
   * Handle creating a new node
   */
  const handleCreateNode = useCallback(
    async (data: {
      title: string;
      content: string;
      type: "document" | "idea" | "task" | "inspiration";
    }) => {
      if (!projectId) return;

      try {
        const newNode = await createNodeAction({
          projectId,
          parentId: nodeDialogParentId || undefined,
          ...data,
        });

        // Revalidate SWR cache and wait for it to complete
        await mutate(`/api/canvas?projectId=${projectId}`);

        // Call onNodeCreated callback to select the new node
        if (newNode && onNodeCreated) {
          onNodeCreated(newNode.id);
        }
      } catch (error) {
        console.error("Failed to create node:", error);
        throw error;
      }
    },
    [projectId, nodeDialogParentId, onNodeCreated]
  );

  /**
   * Handle adding a tag to a node
   */
  const handleAddTag = useCallback((nodeId: string) => {
    setTagDialogNodeId(nodeId);
    setTagDialogOpen(true);
  }, []);

  /**
   * Handle submitting a new tag
   */
  const handleSubmitTag = useCallback(
    async (tag: string) => {
      if (!tagDialogNodeId) return;

      const node = nodes.find((n) => n.id === tagDialogNodeId);
      if (!node) return;

      try {
        const updatedTags = [...(node.tags || []), tag];
        await updateNodeAction({
          id: tagDialogNodeId,
          tags: updatedTags,
        });
        // Revalidate SWR cache
        mutate(`/api/canvas?projectId=${projectId}`);
      } catch (error) {
        console.error("Failed to add tag:", error);
        throw error;
      }
    },
    [tagDialogNodeId, nodes, projectId]
  );

  /**
   * Handle adding a comment
   */
  const handleAddComment = useCallback(
    async (nodeId: string) => {
      if (!commentInput.trim() || !projectId) return;

      try {
        await addCommentAction({
          nodeId,
          projectId,
          content: commentInput,
        });
        setCommentInput("");
        // Revalidate comments cache for this specific node
        mutate(`/api/canvas/${nodeId}/comments`);
      } catch (error) {
        console.error("Failed to add comment:", error);
        throw error;
      }
    },
    [commentInput, projectId]
  );

  /**
   * Handle quick node creation from context menu
   */
  const handleQuickCreateNode = useCallback(
    async (data: { title: string; type: NodeType }, displayOrder?: number) => {
      if (!projectId) return;

      try {
        // Build zone affinities if zone is detected
        const zoneAffinities = quickNodeZone && currentFrameworkId
          ? { [currentFrameworkId]: { [quickNodeZone.zoneKey]: 1.0 } }
          : undefined;

        const newNode = await createNodeAction({
          projectId,
          title: data.title,
          content: "",
          type: data.type,
          zoneAffinities,
          displayOrder,
        });

        // Revalidate SWR cache for both canvas nodes and affinities, wait for completion
        await mutate(`/api/canvas?projectId=${projectId}`);
        if (currentFrameworkId) {
          await mutate(`/api/canvas/affinities?projectId=${projectId}&frameworkId=${currentFrameworkId}`);
        }

        // Reset state
        setQuickNodeZone(null);

        // Call onNodeCreated callback to select the new node
        if (newNode && onNodeCreated) {
          onNodeCreated(newNode.id);
        }
      } catch (error) {
        console.error("Failed to create quick node:", error);
        throw error;
      }
    },
    [projectId, quickNodeZone, currentFrameworkId, onNodeCreated]
  );

  return {
    // Node Dialog
    nodeDialogOpen,
    setNodeDialogOpen,
    nodeDialogParentId,
    handleAddChild,
    handleCreateNode,

    // Quick Node Dialog
    quickNodeDialogOpen,
    setQuickNodeDialogOpen,
    quickNodeZone,
    setQuickNodeZone,
    handleQuickCreateNode,

    // Tag Dialog
    tagDialogOpen,
    setTagDialogOpen,
    tagDialogNodeId,
    handleAddTag,
    handleSubmitTag,

    // Comments
    commentInput,
    setCommentInput,
    handleAddComment,
  };
}
