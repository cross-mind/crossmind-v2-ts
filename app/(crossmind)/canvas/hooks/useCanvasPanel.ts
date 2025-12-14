/**
 * Canvas Panel Hook
 * Manages node detail panel state and URL synchronization
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CanvasNode } from "../canvas-data";

interface UseCanvasPanelProps {
  nodes: CanvasNode[];
  nodeContents: any[]; // NodeContent[] from canvas-data
}

export function useCanvasPanel({ nodes, nodeContents }: UseCanvasPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nodeIdFromUrl = searchParams.get("nodeId");
  const tabFromUrl = searchParams.get("tab");

  // Panel state
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [pendingAIChatPrompt, setPendingAIChatPrompt] = useState<{
    nodeId: string;
    prompt: string;
  } | null>(null);

  // Ref for node creation callback
  const onNodeCreatedRef = useRef<((nodeId: string) => void) | null>(null);

  /**
   * Update URL when selectedNode or tab changes
   */
  const updateUrl = useCallback(
    (nodeId: string | null, tab?: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nodeId) {
        params.set("nodeId", nodeId);
      } else {
        params.delete("nodeId");
        params.delete("tab"); // Remove tab when no node selected
      }

      if (tab && nodeId) {
        params.set("tab", tab);
      } else if (!tab && nodeId) {
        params.delete("tab");
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  /**
   * Handle node click - select node and update URL
   */
  const handleNodeClick = useCallback(
    (node: CanvasNode, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedNode(node);
      setShowAIChat(false); // Reset to document view when selecting a node
      updateUrl(node.id, "document"); // Update URL with nodeId and default tab
    },
    [updateUrl]
  );

  /**
   * Handle close panel - clear selection and URL
   */
  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    setShowAIChat(false); // Reset AI chat state when closing panel
    updateUrl(null); // Clear nodeId and tab from URL
  }, [updateUrl]);

  /**
   * Handle open AI chat - select node and switch to AI chat tab
   */
  const handleOpenAIChat = useCallback(
    (node: CanvasNode) => {
      setSelectedNode(node);
      setShowAIChat(true);
      updateUrl(node.id, "ai-chat"); // Update URL with AI chat tab
    },
    [updateUrl]
  );

  /**
   * Handle set show AI chat - toggle tab and update URL
   */
  const handleSetShowAIChat = useCallback(
    (show: boolean) => {
      setShowAIChat(show);
      if (selectedNode) {
        updateUrl(selectedNode.id, show ? "ai-chat" : "document");
      }
    },
    [selectedNode, updateUrl]
  );

  /**
   * Clear pending AI chat prompt after it's been sent
   */
  const handleClearPendingPrompt = useCallback(() => {
    setPendingAIChatPrompt(null);
  }, []);

  /**
   * Handle node reference click - navigate to referenced node
   */
  const handleNodeReferenceClick = useCallback(
    (nodeId: string) => {
      const referencedNode = nodes.find((n) => n.id === nodeId);
      if (referencedNode) {
        setSelectedNode(referencedNode);
        setShowAIChat(false);
        updateUrl(referencedNode.id, "document"); // Update URL when navigating to referenced node
      }
    },
    [nodes, updateUrl]
  );

  /**
   * Set pending AI chat prompt (used by suggestion handler)
   */
  const setPendingPrompt = useCallback((nodeId: string, prompt: string) => {
    setPendingAIChatPrompt({ nodeId, prompt });
  }, []);

  /**
   * Set node created callback
   */
  const setNodeCreatedCallback = useCallback((callback: (nodeId: string) => void) => {
    onNodeCreatedRef.current = callback;
  }, []);

  /**
   * Handle node creation - poll for node and select it
   */
  useEffect(() => {
    onNodeCreatedRef.current = (nodeId: string) => {
      // Immediately update URL and hide AI chat
      setShowAIChat(false);
      updateUrl(nodeId, "document");

      // Poll for the node to appear in nodeContents after SWR cache update
      let attempts = 0;
      const maxAttempts = 60; // Try for up to 3 seconds (60 * 50ms)

      const intervalId = setInterval(() => {
        const content = nodeContents.find((n) => n.id === nodeId);
        attempts++;

        if (content) {
          // Create a CanvasNode from NodeContent
          const canvasNode: CanvasNode = {
            ...content,
            position: { x: 0, y: 0 }, // Will be calculated by layout
          };
          setSelectedNode(canvasNode);
          clearInterval(intervalId);
        } else if (attempts >= maxAttempts) {
          // Give up after max attempts
          clearInterval(intervalId);
        }
      }, 50);
    };
  }, [nodeContents, updateUrl]);

  /**
   * Restore selected node from URL on initial load and sync with URL changes
   */
  useEffect(() => {
    if (nodeIdFromUrl && nodes.length > 0) {
      // Only restore if the URL node is different from current selection
      const nodeToSelect = nodes.find((n) => n.id === nodeIdFromUrl);
      if (nodeToSelect && (!selectedNode || selectedNode.id !== nodeIdFromUrl)) {
        setSelectedNode(nodeToSelect);
        if (tabFromUrl === "ai-chat") {
          setShowAIChat(true);
        } else {
          setShowAIChat(false);
        }
      }
    } else if (!nodeIdFromUrl && selectedNode) {
      // If URL has no nodeId but we have a selected node, clear it
      // This handles when user closes panel or navigates back
      setSelectedNode(null);
      setShowAIChat(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdFromUrl, tabFromUrl, nodes]);

  return {
    // State
    selectedNode,
    showAIChat,
    pendingAIChatPrompt,

    // Actions
    setSelectedNode,
    handleNodeClick,
    handleClosePanel,
    handleOpenAIChat,
    handleSetShowAIChat,
    handleClearPendingPrompt,
    handleNodeReferenceClick,
    setPendingPrompt,
    setNodeCreatedCallback,
  };
}
