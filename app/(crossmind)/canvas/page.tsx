"use client";

import {
  Plus,
  Tag,
  Sparkles,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { mutate as globalMutate } from "swr";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getAllNodeContents,
  type NodeContent,
  type CanvasNode,
  type AISuggestion,
  type ThinkingFramework,
} from "./canvas-data";
import { useFrameworks } from "@/hooks/use-frameworks";
import { useProjectFramework } from "@/hooks/use-project-framework";
import { useNodeAffinities } from "@/hooks/use-node-affinities";
import { SubscriptionDebugger } from "@/components/SubscriptionDebugger";
import { NodeDetailPanel } from "./components/NodeDetailPanel";
import { CanvasHeader } from "./components/CanvasHeader";
import { CanvasArea } from "./components/CanvasArea";
import { CanvasRoot } from "./components/CanvasRoot";
import { NODE_TYPE_CONFIG } from "./node-type-config";
import { useCanvasNodes, useCanvasComments, useCanvasActivities } from "@/hooks/use-canvas-nodes";
import { useCanvasSuggestionsByFramework } from "@/hooks/use-canvas-suggestions";
import type { CanvasNode as DBCanvasNode, CanvasSuggestion } from "@/lib/db/schema";
import { CanvasDialogs } from "./components/CanvasDialogs";
import { useCanvasActions } from "./hooks/useCanvasActions";
import { useZoomPan } from "./hooks/useZoomPan";
import { useZoneDetection } from "./hooks/useZoneDetection";
import { calculateNextDisplayOrderInZone } from "./lib/canvas-utils";
import { useCanvasDragDrop } from "./hooks/useCanvasDragDrop";
import { DndContext, DragOverlay, rectIntersection } from "@dnd-kit/core";
import { useSession } from "next-auth/react";
import { canvasApi, ApiError } from "@/lib/api/canvas-api";
import { toast } from "sonner";

// Import data transformers and layout engine from centralized modules
import {
  mapCommentToUI,
  mapActivityToUI,
  dbNodesToNodeContents,
  type UIComment as Comment,
  type UIFeedActivity as FeedActivity,
} from "./core/DataTransformers";
import {
  calculateNodePositions,
  calculateZoneConfigs,
  LAYOUT_CONSTANTS,
  type ZoneLayoutConfig,
} from "./core/LayoutEngine";

export default function CanvasPage() {
  // Get projectId from URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");
  const nodeIdFromUrl = searchParams.get("nodeId");
  const tabFromUrl = searchParams.get("tab");

  // Fetch frameworks and project framework preference
  const { frameworks } = useFrameworks();
  const { framework: projectFramework, projectFrameworkId, dimensions: frameworkDimensions, setFramework: setProjectFramework } = useProjectFramework(projectId || "");

  // Debug: Track project framework data changes
  useEffect(() => {
    console.log('[Canvas Page] Project Framework data:', {
      projectFrameworkId,
      frameworkId: projectFramework?.sourceFrameworkId,
      frameworkName: projectFramework?.name,
      healthScore: projectFramework?.healthScore,
      dimensionsCount: frameworkDimensions?.length || 0,
    });
  }, [projectFrameworkId, projectFramework?.sourceFrameworkId, projectFramework?.healthScore, frameworkDimensions?.length]);

  // Fetch real Canvas nodes from database
  const { nodes: dbNodes, isLoading, isError, mutate } = useCanvasNodes(projectId);

  // Get session for user info
  const { data: session } = useSession();

  // Convert database nodes to Canvas format using centralized transformer
  const nodeContents = useMemo<NodeContent[]>(() => {
    // Don't fallback to mock data if still loading (no data and no error yet)
    if (!dbNodes && !isError) {
      return [];
    }

    // If no projectId, use mock data for demo purposes
    if (!projectId) {
      return getAllNodeContents();
    }

    // Use centralized transformer
    return dbNodesToNodeContents(dbNodes);
  }, [dbNodes, projectId, isLoading, isError]);

  // Dynamic layout state
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layoutCalculated, setLayoutCalculated] = useState(false);
  const [zoneBounds, setZoneBounds] = useState<Record<string, { width: number; height: number }>>({});
  const [calculatedZoneConfigs, setCalculatedZoneConfigs] = useState<Record<string, ZoneLayoutConfig>>({});
  const positionsLoadedRef = useRef(false);

  // Track previous data hash to detect changes
  const prevDataHashRef = useRef<string>('');
  const prevAffinityHashRef = useRef<string>('');
  const prevProjectIdRef = useRef<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);

  // Hook to fetch comments for selected node
  const {
    comments: dbComments,
    isLoading: commentsLoading,
  } = useCanvasComments(selectedNode?.id || null);

  // Hook to fetch activities for selected node
  const {
    activities: dbActivities,
    isLoading: activitiesLoading,
  } = useCanvasActivities(selectedNode?.id || null);

  // Framework switcher state - initialize from database
  const [currentFramework, setCurrentFramework] = useState<ThinkingFramework | null>(null);

  // Track previous framework to detect changes
  const prevFrameworkIdRef = useRef<string | null>(null);

  // Fetch node affinities for current framework
  const { nodeAffinities, updateAffinity, isLoading: affinitiesLoading } = useNodeAffinities(
    projectId || "",
    projectFrameworkId || null
  );

  // Fetch suggestions for current framework
  const {
    suggestions: dbSuggestions,
    isLoading: suggestionsLoading,
    mutate: mutateSuggestions,
  } = useCanvasSuggestionsByFramework({
    projectId: projectId || "",
    frameworkId: projectFrameworkId || null,
    status: "pending", // Only show pending suggestions
  });

  // Debug: Track framework changes and suggestion data
  useEffect(() => {
    console.log('[Canvas Page] Framework/Suggestions state:', {
      currentFrameworkId: currentFramework?.id,
      currentFrameworkName: currentFramework?.name,
      suggestionsCount: dbSuggestions.length,
      suggestionsLoading,
      firstSuggestion: dbSuggestions[0] ? {
        id: dbSuggestions[0].id,
        title: dbSuggestions[0].title,
        type: dbSuggestions[0].type,
      } : null,
    });
  }, [currentFramework?.id, dbSuggestions.length, suggestionsLoading]);

  // Track suggestion generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const generationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
    };
  }, []);

  // Node IDs for reference
  const nodeIds = useMemo(() => nodeContents.map(n => n.id), [nodeContents]);

  // Group suggestions by nodeId for efficient lookup
  const suggestionsByNode = useMemo(() => {
    const map = new Map<string, CanvasSuggestion[]>();
    dbSuggestions.forEach((suggestion) => {
      if (suggestion.nodeId) {
        const existing = map.get(suggestion.nodeId) || [];
        map.set(suggestion.nodeId, [...existing, suggestion]);
      }
    });
    return map;
  }, [dbSuggestions]);

  // Reset state when projectId changes
  useEffect(() => {
    if (prevProjectIdRef.current !== null && prevProjectIdRef.current !== projectId) {
      // Reset all node-related state
      setNodes([]);
      setSelectedNode(null);
      setLayoutCalculated(false);
      setShowAIChat(false);
      positionsLoadedRef.current = false;
      prevDataHashRef.current = '';
      prevAffinityHashRef.current = '';

      // Clear node refs
      nodeRefs.current.clear();

      // Force SWR to refetch
      if (projectId) {
        mutate();
      }
    }

    prevProjectIdRef.current = projectId;
  }, [projectId, mutate]);

  // Load project framework or default to first platform framework
  useEffect(() => {
    if (projectFramework) {
      setCurrentFramework(projectFramework as ThinkingFramework);
    } else if (frameworks.length > 0) {
      setCurrentFramework(frameworks[0] as ThinkingFramework);
    }
  }, [projectFramework, frameworks]);

  // Handle framework switching
  useEffect(() => {
    if (!currentFramework) return;

    const currentFrameworkId = currentFramework.id;

    // If framework changed, reset layout to trigger recalculation
    if (prevFrameworkIdRef.current && prevFrameworkIdRef.current !== currentFrameworkId) {
      // Reset layout to trigger recalculation with new framework's affinities
      setNodes([]);
      setLayoutCalculated(false);
      positionsLoadedRef.current = false; // Allow recalculation for new framework
    }

    prevFrameworkIdRef.current = currentFrameworkId;
  }, [currentFramework]);

  // Ref to store node creation callback (to avoid circular dependency)
  const onNodeCreatedRef = useRef<((nodeId: string) => void) | null>(null);

  // Canvas actions hook (handles node creation, tags, comments)
  const {
    nodeDialogOpen,
    setNodeDialogOpen,
    nodeDialogParentId,
    handleAddChild,
    handleCreateNode,
    quickNodeDialogOpen,
    setQuickNodeDialogOpen,
    quickNodeZone,
    setQuickNodeZone,
    handleQuickCreateNode,
    tagDialogOpen,
    setTagDialogOpen,
    tagDialogNodeId,
    handleAddTag,
    handleSubmitTag,
    commentInput,
    setCommentInput,
    handleAddComment,
  } = useCanvasActions({
    projectId,
    nodes,
    currentFrameworkId: currentFramework?.id || null,
    onNodeCreated: (nodeId) => onNodeCreatedRef.current?.(nodeId),
  });

  // Convert node zoneAffinities to the format expected by LayoutEngine
  const convertNodeAffinities = useCallback(() => {
    const result: Record<string, Record<string, number>> = {};

    // If no projectFrameworkId, return empty affinities (all nodes will be unassigned)
    if (!projectFrameworkId) {
      return result;
    }

    nodeContents.forEach(node => {
      if (node.zoneAffinities) {
        const frameworkAffinities = node.zoneAffinities[projectFrameworkId];
        if (frameworkAffinities) {
          result[node.id] = frameworkAffinities;
        }
      }
    });

    return result;
  }, [nodeContents, projectFrameworkId]);

  // Generate dynamic zone configs using LayoutEngine
  const getDynamicZoneConfigs = useCallback(() => {
    // Use calculated configs if available (has correct Y offsets from per-row layout)
    if (Object.keys(calculatedZoneConfigs).length > 0) {
      return calculatedZoneConfigs;
    }

    // Fallback to calculation (will have startY: 0, used before first layout pass)
    if (!currentFramework) return {};
    const affinities = convertNodeAffinities();
    const { configs } = calculateZoneConfigs(currentFramework, nodeContents, affinities);
    return configs;
  }, [calculatedZoneConfigs, currentFramework, nodeContents, convertNodeAffinities]);

  // Zone detection hook for quick node creation
  const detectZone = useZoneDetection(currentFramework, zoneBounds, getDynamicZoneConfigs);

  // Handle background context menu - create node at clicked position
  const handleBackgroundContextMenu = useCallback(
    (x: number, y: number) => {
      // Detect which zone contains the click
      const zone = detectZone(x, y);

      // Set detected zone
      setQuickNodeZone(zone);

      // Open quick creation dialog
      setQuickNodeDialogOpen(true);
    },
    [detectZone, setQuickNodeZone, setQuickNodeDialogOpen]
  );

  // Handle quick node creation with displayOrder calculation
  const handleQuickNodeSubmit = useCallback(
    (data: { title: string; type: "document" | "idea" | "task" | "inspiration" }) => {
      // Calculate displayOrder for the zone using nodeContents (database data)
      const displayOrder = calculateNextDisplayOrderInZone(
        nodeContents || [],
        currentFramework?.id || null,
        quickNodeZone?.zoneKey || null
      );

      // Create the node
      handleQuickCreateNode(data, displayOrder);
    },
    [nodeContents, currentFramework, quickNodeZone, handleQuickCreateNode]
  );

  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [pendingAIChatPrompt, setPendingAIChatPrompt] = useState<{
    nodeId: string;
    prompt: string;
  } | null>(null);

  // Strategic zones always enabled
  const showStrategicZones = true;

  // Use zoom/pan hook for canvas interactions (handles wheel events with native listeners)
  const {
    zoom: scale,
    pan: canvasOffset,
    containerRef: canvasRef, // Use containerRef from hook as canvasRef
    transformRef,
    handleMouseDown: handleCanvasMouseDown,
    handleZoomIn,
    handleZoomOut,
    handleResetView: handleZoomReset,
    handleWheel,
    handleMouseMove,
    handleMouseUp,
  } = useZoomPan();

  // Drag-drop hook (handles node reordering, hierarchy, and zone changes)
  const {
    sensors,
    activeNodeId,
    overNodeId,
    dropPosition,
    handleDragStart,
    handleDragOver,
    handleDragMove,
    handleDragEnd,
  } = useCanvasDragDrop({
    nodes,
    projectId: projectId || "",
    currentFramework,
    updateAffinity,
  });

  // These refs are still needed for layout calculations
  const zonesContainerRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);

  // Update URL when selectedNode changes
  const updateUrl = useCallback((nodeId: string | null, tab?: string) => {
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
  }, [searchParams, router]);

  const handleNodeClick = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    setShowAIChat(false); // Reset to document view when selecting a node
    updateUrl(node.id, "document"); // Update URL with nodeId and default tab
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
    setShowAIChat(false); // Reset AI chat state when closing panel
    updateUrl(null); // Clear nodeId and tab from URL
  };

  // Set node creation callback
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

  // Build user lookup map (temporary solution)
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    if (session?.user?.id && session?.user?.email) {
      map.set(session.user.id, session.user.email);
    }
    return map;
  }, [session]);

  // Transform database comments to UI format
  const getComments = useCallback((nodeId: string): Comment[] => {
    if (!selectedNode || selectedNode.id !== nodeId) return [];
    if (commentsLoading) return [];
    return (dbComments || []).map(c => mapCommentToUI(c, userMap));
  }, [selectedNode, dbComments, commentsLoading, userMap]);

  // Transform database activities to UI format
  const getFeedActivities = useCallback((nodeId: string): FeedActivity[] => {
    if (!selectedNode || selectedNode.id !== nodeId) return [];
    if (activitiesLoading) return [];
    return (dbActivities || []).map(a => mapActivityToUI(a, userMap));
  }, [selectedNode, dbActivities, activitiesLoading, userMap]);

  const handleOpenAIChat = (node: CanvasNode) => {
    setSelectedNode(node);
    setShowAIChat(true);
    updateUrl(node.id, "ai-chat"); // Update URL with AI chat tab
  };

  // Wrapper for setShowAIChat that also updates URL
  const handleSetShowAIChat = useCallback((show: boolean) => {
    setShowAIChat(show);
    if (selectedNode) {
      updateUrl(selectedNode.id, show ? "ai-chat" : "document");
    }
  }, [selectedNode, updateUrl]);

  // Suggestion handlers
  const handleApplySuggestion = useCallback(async (suggestionId: string) => {
    try {
      const result = await canvasApi.suggestions.apply(suggestionId);

      // Refresh data first for all types
      await Promise.all([
        mutate(),
        mutateSuggestions(),
      ]);

      // Handle content-suggestion type - open AI Chat with pre-filled prompt
      if (result.type === "content-suggestion" && result.result?.changes) {
        const { nodeId, prefilledPrompt } = result.result.changes;

        // Find the target node after refresh
        const fullNode = nodes.find(n => n.id === nodeId);
        if (fullNode) {
          setSelectedNode(fullNode);
          setShowAIChat(true);
          setPendingAIChatPrompt({
            nodeId,
            prompt: prefilledPrompt,
          });
          updateUrl(nodeId, "ai-chat");
        }
      } else {
        // For other types (add-tag, add-node, etc.)
        // If the current selected node was affected, refresh its data
        if (selectedNode && result.result?.affectedNodeId === selectedNode.id) {
          const fullNode = nodes.find(n => n.id === selectedNode.id);
          if (fullNode) {
            setSelectedNode(fullNode);
          }
        }
      }
    } catch (error) {
      console.error("[Canvas] Failed to apply suggestion:", error);
    }
  }, [nodes, selectedNode, mutate, mutateSuggestions, updateUrl]);

  const handleDismissSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await canvasApi.suggestions.dismiss(suggestionId);

      // Refresh suggestions list
      await mutateSuggestions();
    } catch (error) {
      console.error("[Canvas] Failed to dismiss suggestion:", error);
    }
  }, [mutateSuggestions]);

  const handleGenerateSuggestions = useCallback(async () => {
    console.log('[Canvas] handleGenerateSuggestions called', {
      projectId,
      projectFrameworkId,
      isGenerating,
    });

    if (!projectId || isGenerating) {
      console.warn('[Canvas] Early return triggered - missing projectId or already generating');
      return;
    }

    setIsGenerating(true);
    setElapsedTime(0);

    // Start timer
    const startTime = Date.now();
    generationTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      // Call health analysis start API (API will create ProjectFramework if needed)
      const response = await fetch("/api/canvas/health-analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          projectFrameworkId, // Can be null, API will handle it
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start health analysis session");
      }

      const { chatId } = await response.json();

      // Redirect to chat page with auto-send query to trigger AI analysis
      const initialQuery = "请开始分析框架健康度";
      router.push(`/chat/${chatId}?query=${encodeURIComponent(initialQuery)}`);
    } catch (error) {
      console.error("[Canvas] Failed to start health analysis:", error);
      toast.error("启动分析失败", {
        description: "无法启动健康度分析，请稍后重试。",
      });
    } finally {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setIsGenerating(false);
    }
  }, [projectId, projectFrameworkId, isGenerating, router]);

  // Generate suggestions for a specific node
  const handleGenerateNodeSuggestions = useCallback(async (node: CanvasNode) => {
    if (!projectId || !currentFramework) return;

    // Prevent duplicate requests
    if (generatingNodeId === node.id) {
      toast.info("正在处理中", {
        description: `节点「${node.title}」的建议生成正在进行中，请稍候...`,
      });
      return;
    }

    // Set generating state
    setGeneratingNodeId(node.id);

    // Show loading toast
    const loadingToast = toast.loading("正在分析...", {
      description: `正在为节点「${node.title}」生成建议`,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      await canvasApi.suggestions.generate(
        {
          projectId,
          frameworkId: currentFramework.id,
          nodeId: node.id,
        },
        controller.signal
      );

      clearTimeout(timeoutId);
      await mutateSuggestions();

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success("分析完成", {
        description: `已为节点「${node.title}」生成建议`,
      });
    } catch (error) {
      console.error("[Canvas] Failed to generate node suggestions:", error);
      clearTimeout(timeoutId);
      toast.dismiss(loadingToast);

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error("分析超时", {
          description: "AI 分析时间过长（超过 60 秒），请稍后重试。",
        });
      } else {
        toast.error("分析失败", {
          description: "无法生成节点建议，请稍后重试。",
        });
      }
    } finally {
      // Clear generating state
      setGeneratingNodeId(null);
    }
  }, [projectId, currentFramework, mutateSuggestions, generatingNodeId]);

  // Restore selected node from URL on initial load and sync with URL changes
  useEffect(() => {
    if (nodeIdFromUrl && nodes.length > 0) {
      // Only restore if the URL node is different from current selection
      const nodeToSelect = nodes.find(n => n.id === nodeIdFromUrl);
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

  const handleDelete = async (node: CanvasNode) => {
    if (!confirm(`确定要删除节点"${node.title}"吗？这将同时删除其所有子节点。`)) {
      return;
    }

    // Close panel if the deleted node was selected
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      setShowAIChat(false);
      updateUrl(null); // Clear URL when selected node is deleted
    }

    try {
      // Call API first
      await canvasApi.nodes.delete(node.id);

      // Revalidate to get fresh data from server
      // Layout logic will handle preserving positions of remaining nodes
      await mutate();
    } catch (error) {
      if (error instanceof ApiError) {
        console.error("API Error:", error.message, error.status);
      } else {
        console.error("Error deleting node:", error);
      }
      alert("删除节点失败，请重试");
    }
  };

  const handleMoveToZone = async (node: CanvasNode, targetZoneKey: string) => {
    if (!currentFramework) {
      console.error("[MoveToZone] No framework selected");
      return;
    }

    try {
      // Create new affinities: target zone = 1, all others = 0
      const newAffinities: Record<string, number> = {};
      currentFramework.zones.forEach((zone) => {
        newAffinities[zone.zoneKey] = zone.zoneKey === targetZoneKey ? 1 : 0;
      });

      // Update affinity in database
      await updateAffinity(node.id, newAffinities);

      // Revalidate both canvas data and affinities to trigger layout recalculation
      if (projectId) {
        await mutate();
        // Also revalidate affinities
        const { mutate: mutateAffinities } = await import('swr');
        mutateAffinities(`/api/canvas/affinities?projectId=${projectId}&frameworkId=${currentFramework.id}`);
      }
    } catch (error) {
      console.error("[MoveToZone] Failed to move node:", error);
      alert("移动节点失败，请重试");
    }
  };

  // Handle hiding a node in the current framework
  const handleHideNode = async (node: CanvasNode) => {
    if (!currentFramework?.id) {
      console.error("[HideNode] No framework selected");
      return;
    }

    try {
      await canvasApi.nodes.hide(node.id, currentFramework.id);

      // Revalidate to update UI by explicitly calling global mutate with the SWR key
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
  };

  // Handle restoring a hidden node
  const handleRestoreNode = async (nodeId: string) => {
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
      await canvasApi.nodes.restore(nodeId, currentFramework.id);

      // Revalidate to update UI by explicitly calling global mutate with the SWR key
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
  };

  // Handle framework change
  const handleFrameworkChange = async (framework: ThinkingFramework) => {
    console.log('[Canvas Page] Framework change requested:', {
      oldFrameworkId: currentFramework?.id,
      newFrameworkId: framework.id,
      oldFrameworkName: currentFramework?.name,
      newFrameworkName: framework.name,
    });

    setCurrentFramework(framework);
    // Reset layout to trigger recalculation with new framework
    setLayoutCalculated(false);
    setNodes([]);
    setZoneBounds({});

    // Save framework preference to project
    if (projectId) {
      try {
        console.log('[Canvas Page] Saving framework preference to backend...');
        await setProjectFramework(framework.id);
        console.log('[Canvas Page] Framework preference saved, forcing suggestions refresh...');
        // Force refresh suggestions for new framework
        await mutateSuggestions();
        console.log('[Canvas Page] Suggestions refresh triggered');
      } catch (error) {
        console.error('[Canvas Page] Failed to save framework preference:', error);
      }
    }
  };

  // Handle node reference click [[node-id]]
  const handleNodeReferenceClick = (nodeId: string) => {
    const referencedNode = nodes.find((n) => n.id === nodeId);
    if (referencedNode) {
      setSelectedNode(referencedNode);
      setShowAIChat(false);
      updateUrl(referencedNode.id, "document"); // Update URL when navigating to referenced node
    }
  };

  // Process content to add clickable node references
  const processContentWithReferences = (content: string) => {
    // Replace [[node-id]] with clickable links
    return content.replace(/\[\[([^\]]+)\]\]/g, (match, nodeId) => {
      const referencedNode = nodes.find((n) => n.id === nodeId);
      const title = referencedNode?.title || nodeId;
      return `[📎 ${title}](#${nodeId})`;
    });
  };

  // Handle affinity changes (zone reassignment after drag-drop)
  useEffect(() => {
    // Create hash from node zoneAffinities for current framework
    const affinityHash = JSON.stringify(
      nodeContents.map(node => ({
        id: node.id,
        affinities: node.zoneAffinities?.[currentFramework?.id || ''] || {}
      }))
    );

    // Only trigger layout recalculation if:
    // 1. Positions have been loaded (not initial load)
    // 2. Affinities actually changed
    // 3. We have nodes rendered
    if (
      positionsLoadedRef.current &&
      prevAffinityHashRef.current &&
      prevAffinityHashRef.current !== affinityHash &&
      nodes.length > 0
    ) {
      // Update nodes with latest content while preserving positions
      // This ensures affinity changes are reflected immediately
      setNodes(prevNodes =>
        prevNodes.map(prevNode => {
          const updatedContent = nodeContents.find(nc => nc.id === prevNode.id);
          return updatedContent
            ? { ...updatedContent, position: prevNode.position }
            : prevNode;
        })
      );
      // Trigger layout recalculation while preserving current positions
      // This allows CSS transitions to smoothly animate to new positions
      setLayoutCalculated(false);
    }

    prevAffinityHashRef.current = affinityHash;
  }, [nodeContents, currentFramework, nodes.length]);

  // Reset layout when data changes (e.g., after drag-drop update via SWR)
  useEffect(() => {
    if (dbNodes && dbNodes.length > 0) {
      // Create a stable hash of node data to detect actual changes
      const dataHash = dbNodes
        .map(n => {
          const hiddenFrameworks = (n as any).hiddenInFrameworks || {};
          const hiddenHash = Object.keys(hiddenFrameworks).sort().map(k => `${k}:${hiddenFrameworks[k]}`).join(',');
          return `${n.id}-${n.displayOrder}-${n.parentId || 'null'}-${hiddenHash}`;
        })
        .sort()
        .join('|');

      if (prevDataHashRef.current && prevDataHashRef.current !== dataHash) {
        // Update node data while preserving existing positions
        // Only recalculate layout if nodes are added/removed
        const prevNodeIds = new Set(nodes.map(n => n.id));
        const newNodeIds = new Set(nodeContents.map(n => n.id));

        const nodesAdded = nodeContents.some(n => !prevNodeIds.has(n.id));
        const nodesRemoved = nodes.some(n => !newNodeIds.has(n.id));

        // Check if displayOrder changed (for drag-drop reordering)
        const displayOrderChanged = nodes.some(n => {
          const updatedNode = nodeContents.find(nc => nc.id === n.id);
          return updatedNode && updatedNode.displayOrder !== n.displayOrder;
        });

        if (nodesAdded && nodes.length > 0) {
          // Nodes added - preserve existing positions, only calculate for new nodes
          // Find the new nodes
          const newNodeIds = nodeContents.filter(n => !prevNodeIds.has(n.id));

          // Update existing nodes with latest content while keeping positions
          // New nodes will be added off-screen and positioned in next layout pass
          setNodes(prevNodes => {
            const updatedExisting = prevNodes.map(prevNode => {
              const updatedContent = nodeContents.find(nc => nc.id === prevNode.id);
              return updatedContent
                ? { ...updatedContent, position: prevNode.position }
                : prevNode;
            });

            // Add new nodes off-screen for measurement
            const newNodesOffScreen = newNodeIds.map(node => ({
              ...node,
              position: { x: -9999, y: -9999 }
            }));

            return [...updatedExisting, ...newNodesOffScreen];
          });

          // Trigger layout calculation for new nodes only
          setLayoutCalculated(false);
        } else if (nodesRemoved) {
          // Nodes removed - trigger layout recalculation to fill gaps
          setNodes(prevNodes => {
            const remaining = prevNodes.filter(prevNode => newNodeIds.has(prevNode.id));
            // Update content while keeping positions temporarily
            return remaining.map(prevNode => {
              const updatedContent = nodeContents.find(nc => nc.id === prevNode.id);
              return updatedContent
                ? { ...updatedContent, position: prevNode.position }
                : prevNode;
            });
          });
          // Trigger recalculation to rearrange nodes and fill gaps
          setLayoutCalculated(false);
        } else if (nodes.length === 0) {
          // Initial load
          setLayoutCalculated(false);
          setNodes([]);
        } else if (displayOrderChanged) {
          // DisplayOrder changed (drag-drop) - need recalculation
          setLayoutCalculated(false);
          // Update nodes with new displayOrder while preserving current positions
          // This allows CSS transitions to smoothly animate from current to new positions
          setNodes(prevNodes =>
            prevNodes.map(prevNode => {
              const updatedContent = nodeContents.find(nc => nc.id === prevNode.id);
              return updatedContent
                ? { ...updatedContent, position: prevNode.position } // Keep existing position, update displayOrder
                : prevNode;
            })
          )
        } else {
          // Only other data changed - update in place
          setNodes(prevNodes =>
            prevNodes.map(prevNode => {
              const updatedContent = nodeContents.find(nc => nc.id === prevNode.id);
              return updatedContent
                ? { ...updatedContent, position: prevNode.position } // Keep existing position
                : prevNode;
            })
          );
        }
      }

      prevDataHashRef.current = dataHash;
    }
  }, [dbNodes, nodes, nodeContents]);

  // Calculate layout using LayoutEngine
  useEffect(() => {
    // Wait for data to load
    if (nodeContents.length === 0) {
      return;
    }

    if (affinitiesLoading) {
      return;
    }

    if (!currentFramework) {
      return;
    }

    // Render off-screen for measurement (only once)
    if (!positionsLoadedRef.current) {
      if (nodes.length === 0) {
        const tempNodes = nodeContents.map(content => ({
          ...content,
          position: { x: -9999, y: -9999 },
        }));
        setNodes(tempNodes);
        return;
      }

      positionsLoadedRef.current = true;
    }

    // Wait for next frame to ensure DOM is updated
    requestAnimationFrame(() => {
      // Convert node zoneAffinities to the format expected by LayoutEngine
      const affinities = convertNodeAffinities();

      // Use LayoutEngine to calculate positions
      const { nodes: calculatedNodes, zoneBounds: calculatedZoneBounds, zoneConfigs: calculatedZoneConfigs } = calculateNodePositions(
        nodeContents,
        currentFramework,
        affinities,
        nodeRefs.current
      );

      setNodes(calculatedNodes);
      setZoneBounds(calculatedZoneBounds);
      setCalculatedZoneConfigs(calculatedZoneConfigs);
      setLayoutCalculated(true);
    });
  }, [nodeContents, currentFramework, convertNodeAffinities, affinitiesLoading, nodes.length]);

  // Node type config
  const nodeTypeConfig = NODE_TYPE_CONFIG;


  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading Canvas...</p>
          {projectId && <p className="text-xs text-muted-foreground">Project: {projectId}</p>}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Failed to load Canvas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {projectId
                ? "Could not load nodes for this project. Please check if the project exists."
                : "Please provide a valid projectId in the URL."}
            </p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no nodes)
  if (!projectId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Welcome to Canvas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              To get started, add a projectId to the URL:
            </p>
            <code className="text-xs bg-muted px-3 py-1 rounded">
              /canvas?projectId=your-project-id
            </code>
            <p className="text-xs text-muted-foreground mt-4">
              Or use the test project: <br />
              <a
                href="/canvas?projectId=cfdd5092-ab38-4612-a1c2-4d3342ee0444"
                className="text-primary hover:underline"
              >
                View Demo Project
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CanvasRoot
      nodes={nodes}
      allNodes={dbNodes || []}
      currentFramework={currentFramework}
      frameworks={frameworks}
      projectId={projectId}
      layoutCalculated={layoutCalculated}
      zoneBounds={zoneBounds}
      suggestionsByNode={suggestionsByNode}
      isGenerating={isGenerating}
      elapsedTime={elapsedTime}
      onNodeDelete={handleDelete}
      onNodeMoveToZone={handleMoveToZone}
      onNodeHide={handleHideNode}
      onNodeRestore={handleRestoreNode}
      onFrameworkChange={handleFrameworkChange}
      onApplySuggestion={handleApplySuggestion}
      onDismissSuggestion={handleDismissSuggestion}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full w-full flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <CanvasHeader
        currentFramework={currentFramework}
        projectFramework={projectFramework}
        onFrameworkChange={handleFrameworkChange}
        nodes={nodes}
        suggestions={dbSuggestions}
        dimensions={frameworkDimensions}
        suggestionsLoading={suggestionsLoading}
        isGenerating={isGenerating}
        elapsedTime={elapsedTime}
        onCreateNode={() => setNodeDialogOpen(true)}
        onGenerateSuggestions={handleGenerateSuggestions}
        onApplySuggestion={handleApplySuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <CanvasArea
          canvasRef={canvasRef}
          transformRef={transformRef}
          zonesContainerRef={zonesContainerRef}
          nodesContainerRef={nodesContainerRef}
          nodeRefs={nodeRefs}
          canvasOffset={canvasOffset}
          scale={scale}
          showStrategicZones={showStrategicZones}
          getDynamicZoneConfigs={getDynamicZoneConfigs}
          onCanvasMouseDown={handleCanvasMouseDown}
          onNodeClick={handleNodeClick}
          onOpenAIChat={handleOpenAIChat}
          onAddChild={handleAddChild}
          onGenerateNodeSuggestions={handleGenerateNodeSuggestions}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onBackgroundContextMenu={handleBackgroundContextMenu}
          activeNodeId={activeNodeId}
          overNodeId={overNodeId}
          dropPosition={dropPosition}
          generatingNodeId={generatingNodeId}
        />

        {/* Right Panel */}
        {selectedNode && projectId && (
          <NodeDetailPanel
            selectedNode={selectedNode}
            showAIChat={showAIChat}
            commentInput={commentInput}
            pendingAIChatPrompt={
              pendingAIChatPrompt?.nodeId === selectedNode.id
                ? pendingAIChatPrompt
                : null
            }
            onClose={handleClosePanel}
            onSetShowAIChat={handleSetShowAIChat}
            onNodeClick={handleNodeClick}
            onAddTag={handleAddTag}
            onCommentInputChange={setCommentInput}
            onAddComment={() => selectedNode && handleAddComment(selectedNode.id)}
            onClearPendingPrompt={() => setPendingAIChatPrompt(null)}
            getFeedActivities={getFeedActivities}
            getComments={getComments}
            processContentWithReferences={processContentWithReferences}
            handleNodeReferenceClick={handleNodeReferenceClick}
          />
        )}
      </div>

      {/* Subscription Debugger */}
      <SubscriptionDebugger />

      {/* All Canvas Dialogs */}
      <CanvasDialogs
        nodeDialogOpen={nodeDialogOpen}
        setNodeDialogOpen={setNodeDialogOpen}
        nodeDialogParentId={nodeDialogParentId}
        onNodeCreate={handleCreateNode}
        tagDialogOpen={tagDialogOpen}
        setTagDialogOpen={setTagDialogOpen}
        tagDialogNodeId={tagDialogNodeId}
        tagDialogExistingTags={tagDialogNodeId ? nodes.find((n) => n.id === tagDialogNodeId)?.tags || [] : []}
        onTagSubmit={handleSubmitTag}
        quickNodeDialogOpen={quickNodeDialogOpen}
        setQuickNodeDialogOpen={setQuickNodeDialogOpen}
        quickNodeZone={quickNodeZone}
        onQuickNodeSubmit={handleQuickNodeSubmit}
      />
      </div>
    </DndContext>
    </CanvasRoot>
  );
}
