/**
 * Canvas Actions Hook
 * Handles all node-related actions (create, update, tag, comment)
 */

import { useState, useCallback } from "react";
import { mutate } from "swr";
import type { CanvasNode } from "../canvas-data";
import { createNodeAction, addCommentAction, updateNodeAction } from "../actions";

interface UseCanvasActionsProps {
  projectId: string | null;
  nodes: CanvasNode[];
}

export function useCanvasActions({ projectId, nodes }: UseCanvasActionsProps) {
  // Node Dialog state
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [nodeDialogParentId, setNodeDialogParentId] = useState<string | null>(null);

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
        await createNodeAction({
          projectId,
          parentId: nodeDialogParentId || undefined,
          ...data,
        });
        // Revalidate SWR cache
        mutate(`/api/canvas?projectId=${projectId}`);
      } catch (error) {
        console.error("Failed to create node:", error);
        throw error;
      }
    },
    [projectId, nodeDialogParentId]
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
        const updatedTags = [...node.tags, tag];
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
        // Revalidate SWR cache
        mutate(`/api/canvas?projectId=${projectId}`);
      } catch (error) {
        console.error("Failed to add comment:", error);
        throw error;
      }
    },
    [commentInput, projectId]
  );

  return {
    // Node Dialog
    nodeDialogOpen,
    setNodeDialogOpen,
    nodeDialogParentId,
    handleAddChild,
    handleCreateNode,

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
