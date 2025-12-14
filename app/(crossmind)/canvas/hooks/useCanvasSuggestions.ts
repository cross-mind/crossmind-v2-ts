/**
 * Canvas Suggestions Hook
 * Manages AI suggestion generation, application, and dismissal
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { mutate } from "swr";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import { canvasApi, ApiError } from "@/lib/api/canvas-api";

interface UseCanvasSuggestionsProps {
  projectId: string | null;
  currentFramework: ThinkingFramework | null;
  nodes: CanvasNode[];
  selectedNode: CanvasNode | null;
  onSetSelectedNode: (node: CanvasNode) => void;
  onSetShowAIChat: (show: boolean) => void;
  onSetPendingPrompt: (nodeId: string, prompt: string) => void;
  onUpdateUrl: (nodeId: string, tab: string) => void;
  mutateSuggestions: () => Promise<void>;
}

export function useCanvasSuggestions({
  projectId,
  currentFramework,
  nodes,
  selectedNode,
  onSetSelectedNode,
  onSetShowAIChat,
  onSetPendingPrompt,
  onUpdateUrl,
  mutateSuggestions,
}: UseCanvasSuggestionsProps) {
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const generationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Generate AI suggestions for current framework
   */
  const handleGenerateSuggestions = useCallback(async () => {
    if (!projectId || !currentFramework || isGenerating) return;

    setIsGenerating(true);
    setElapsedTime(0);

    // Start timer
    const startTime = Date.now();
    generationTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const controller = new AbortController();

    // Set timeout (60 seconds)
    const timeoutId = setTimeout(() => {
      controller.abort();
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setIsGenerating(false);
      console.error("[Canvas] Suggestion generation timed out after 60 seconds");
    }, 60000);

    try {
      await canvasApi.suggestions.generate(
        {
          projectId,
          frameworkId: currentFramework.id,
        },
        controller.signal
      );

      clearTimeout(timeoutId);

      // Refresh suggestions list
      await mutateSuggestions();
    } catch (error) {
      console.error("[Canvas] Failed to generate suggestions:", error);
      clearTimeout(timeoutId);
    } finally {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setIsGenerating(false);
    }
  }, [projectId, currentFramework, mutateSuggestions, isGenerating]);

  /**
   * Apply a suggestion
   */
  const handleApplySuggestion = useCallback(
    async (suggestionId: string) => {
      try {
        const result = await canvasApi.suggestions.apply(suggestionId);

        // Refresh data first for all types
        await Promise.all([
          mutate(`/api/canvas?projectId=${projectId}`),
          mutateSuggestions(),
        ]);

        // Handle content-suggestion type - open AI Chat with pre-filled prompt
        if (result.type === "content-suggestion" && result.result?.changes) {
          const { nodeId, prefilledPrompt } = result.result.changes;

          // Find the target node after refresh
          const fullNode = nodes.find((n) => n.id === nodeId);
          if (fullNode) {
            onSetSelectedNode(fullNode);
            onSetShowAIChat(true);
            onSetPendingPrompt(nodeId, prefilledPrompt);
            onUpdateUrl(nodeId, "ai-chat");
          }
        } else {
          // For other types (add-tag, add-node, etc.)
          // If the current selected node was affected, refresh its data
          if (selectedNode && result.result?.affectedNodeId === selectedNode.id) {
            const fullNode = nodes.find((n) => n.id === selectedNode.id);
            if (fullNode) {
              onSetSelectedNode(fullNode);
            }
          }
        }
      } catch (error) {
        console.error("[Canvas] Failed to apply suggestion:", error);
      }
    },
    [
      nodes,
      selectedNode,
      projectId,
      mutateSuggestions,
      onSetSelectedNode,
      onSetShowAIChat,
      onSetPendingPrompt,
      onUpdateUrl,
    ]
  );

  /**
   * Dismiss a suggestion
   */
  const handleDismissSuggestion = useCallback(
    async (suggestionId: string) => {
      try {
        await canvasApi.suggestions.dismiss(suggestionId);

        // Refresh suggestions list
        await mutateSuggestions();
      } catch (error) {
        if (error instanceof ApiError) {
          console.error("[Canvas] API error:", error.message, error.status);
        } else {
          console.error("[Canvas] Failed to dismiss suggestion:", error);
        }
      }
    },
    [mutateSuggestions]
  );

  return {
    // State
    isGenerating,
    elapsedTime,

    // Actions
    handleGenerateSuggestions,
    handleApplySuggestion,
    handleDismissSuggestion,
  };
}
