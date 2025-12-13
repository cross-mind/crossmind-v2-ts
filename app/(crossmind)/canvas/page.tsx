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
  NODE_WIDTH,
  VERTICAL_GAP,
  COLUMN_GAP,
  MOCK_SUGGESTIONS,
  type NodeContent,
  type CanvasNode,
  type FeedActivity,
  type Comment,
  type AISuggestion,
  type ThinkingFramework,
} from "./canvas-data";
import { useFrameworks } from "@/hooks/use-frameworks";
import { useProjectFramework } from "@/hooks/use-project-framework";
import { useNodeAffinities } from "@/hooks/use-node-affinities";
import { SubscriptionDebugger } from "@/components/SubscriptionDebugger";
import { NodeDetailPanel } from "./components/NodeDetailPanel";
import { type StageFilterType } from "./components/StageFilter";
import { CanvasHeader } from "./components/CanvasHeader";
import { CanvasArea } from "./components/CanvasArea";
import { NODE_TYPE_CONFIG } from "./node-type-config";
import { extractStageFromTags } from "./lib/canvas-helpers";
import { useCanvasNodes, useCanvasComments, useCanvasActivities } from "@/hooks/use-canvas-nodes";
import { useCanvasSuggestionsByFramework } from "@/hooks/use-canvas-suggestions";
import type { CanvasNode as DBCanvasNode, CanvasNodeComment, CanvasNodeActivity, CanvasSuggestion } from "@/lib/db/schema";
import { NodeDialog } from "./components/NodeDialog";
import { TagDialog } from "./components/TagDialog";
import { QuickNodeDialog } from "./components/QuickNodeDialog";
import { useCanvasActions } from "./hooks/useCanvasActions";
import { useZoomPan } from "./hooks/useZoomPan";
import { useZoneDetection } from "./hooks/useZoneDetection";
import { calculateNextDisplayOrderInZone } from "./lib/canvas-utils";
import { useCanvasDragDrop } from "./hooks/useCanvasDragDrop";
import { useNodePositions } from "@/hooks/use-node-positions";
import { DndContext, DragOverlay, rectIntersection } from "@dnd-kit/core";
import { useSession } from "next-auth/react";

/**
 * Transform database CanvasNodeComment to UI Comment format
 * Handles user lookup and timestamp formatting
 */
function mapCommentToUI(comment: CanvasNodeComment, users: Map<string, string>): Comment {
  const formatTimestamp = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString();
  };

  return {
    id: comment.id,
    user: comment.authorId ? (users.get(comment.authorId) || comment.authorId.slice(0, 8)) : "Unknown",
    timestamp: formatTimestamp(comment.createdAt),
    content: comment.content,
  };
}

/**
 * Transform database CanvasNodeActivity to UI FeedActivity format
 * Handles user lookup and timestamp formatting
 */
function mapActivityToUI(activity: CanvasNodeActivity, users: Map<string, string>): FeedActivity {
  const formatTimestamp = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return dateObj.toLocaleDateString();
  };

  return {
    id: activity.id,
    type: activity.type as "created" | "updated" | "status_changed" | "tag_added" | "comment_added",
    user: activity.userId ? (users.get(activity.userId) || activity.userId.slice(0, 8)) : "System",
    timestamp: formatTimestamp(activity.createdAt),
    description: activity.description,
    details: activity.details || undefined,
  };
}

export default function CanvasPage() {
  // Get projectId from URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId");
  const nodeIdFromUrl = searchParams.get("nodeId");
  const tabFromUrl = searchParams.get("tab");

  // Fetch frameworks and project framework preference
  const { frameworks } = useFrameworks();
  const { framework: projectFramework, setFramework: setProjectFramework } = useProjectFramework(projectId || "");

  // Fetch real Canvas nodes from database
  const { nodes: dbNodes, isLoading, isError, mutate } = useCanvasNodes(projectId);

  // Get session for user info
  const { data: session } = useSession();

  // Convert database nodes to Canvas format
  const nodeContents = useMemo<NodeContent[]>(() => {
    console.log('[Canvas Page] Database nodes:', {
      hasDbNodes: !!dbNodes,
      nodeCount: dbNodes?.length || 0,
      projectId,
      isLoading,
      isError
    });

    // Don't fallback to mock data if still loading (no data and no error yet)
    if (!dbNodes && !isError) {
      console.log('[Canvas Page] Still loading, returning empty array');
      return [];
    }

    // If no projectId, use mock data for demo purposes
    if (!projectId) {
      return getAllNodeContents();
    }

    // If API returned empty array after loading, keep it empty (don't fallback to mock)
    if (!dbNodes || dbNodes.length === 0) {
      return [];
    }
    // Map database nodes to NodeContent format
    return dbNodes.map((dbNode) => ({
      id: dbNode.id,
      title: dbNode.title,
      content: dbNode.content,
      type: dbNode.type as "document" | "idea" | "task" | "inspiration",
      parentId: dbNode.parentId || undefined,  // Include parentId for hierarchical structure
      tags: dbNode.tags || [],
      stage: extractStageFromTags(dbNode.tags),
      health: dbNode.healthScore ? Number.parseInt(dbNode.healthScore) : undefined,
      references: dbNode.references || [],
      children: dbNode.children || [],
      displayOrder: dbNode.displayOrder, // Include displayOrder for drag-drop
      hiddenInFrameworks: (dbNode as any).hiddenInFrameworks || {}, // Include hiddenInFrameworks for filtering
    }));
  }, [dbNodes, projectId, isLoading, isError]);

  // Dynamic layout state
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layoutCalculated, setLayoutCalculated] = useState(false);
  const [zoneBounds, setZoneBounds] = useState<Record<string, { width: number; height: number }>>({});
  const positionsLoadedRef = useRef(false);

  // Track previous data hash to detect changes
  const prevDataHashRef = useRef<string>('');
  const prevAffinityHashRef = useRef<string>('');
  const prevProjectIdRef = useRef<string | null>(null);

  // Zone layout constants (moved outside getDynamicZoneConfigs for reuse)
  const ZONE_WIDTH = 800;
  const ZONE_GAP = 20;
  const ZONE_ROW_HEIGHT = 1000;

  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [stageFilter, setStageFilter] = useState<StageFilterType>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
    currentFramework?.id || null
  );

  // Fetch suggestions for current framework
  const {
    suggestions: dbSuggestions,
    isLoading: suggestionsLoading,
    mutate: mutateSuggestions,
  } = useCanvasSuggestionsByFramework({
    projectId: projectId || "",
    frameworkId: currentFramework?.id || null,
    status: "pending", // Only show pending suggestions
  });

  // Track suggestion generation state
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

  // Fetch and persist node positions for current framework
  const nodeIds = useMemo(() => nodeContents.map(n => n.id), [nodeContents]);
  const { positions: persistedPositions, savePositions, saveImmediately, isLoading: positionsLoading } = useNodePositions(
    currentFramework?.id || null,
    nodeIds
  );

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
      console.log('[Canvas Page] Project changed, resetting state', {
        prevProjectId: prevProjectIdRef.current,
        newProjectId: projectId,
      });

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

    // If framework changed, save current positions immediately and reset layout
    if (prevFrameworkIdRef.current && prevFrameworkIdRef.current !== currentFrameworkId) {
      console.log('[Framework Switch] Saving positions for old framework and resetting layout', {
        oldFramework: prevFrameworkIdRef.current,
        newFramework: currentFrameworkId,
      });

      // Save current positions immediately (don't wait for debounce)
      saveImmediately();

      // Reset layout to trigger reload with new framework's positions
      setNodes([]);
      setLayoutCalculated(false);
      positionsLoadedRef.current = false; // Allow loading positions for new framework
    }

    prevFrameworkIdRef.current = currentFrameworkId;
  }, [currentFramework, saveImmediately]);

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

  // Generate dynamic zone configs based on current framework
  const getDynamicZoneConfigs = useCallback(() => {
    if (!currentFramework) return {};


    const configs: Record<string, { startX: number; startY: number; columnCount: number; nodeIds: string[] }> = {};

    const zoneCount = currentFramework.zones.length;

    // Smart layout: if more than 5 zones, use grid layout
    let zonesPerRow = zoneCount;
    let rowCount = 1;

    if (zoneCount > 5) {
      zonesPerRow = zoneCount <= 8 ? 4 : 3; // 6-8 zones: 4 per row, 9+ zones: 3 per row
      rowCount = Math.ceil(zoneCount / zonesPerRow);
    }

    // Initialize zone configs with grid positions
    currentFramework.zones.forEach((zone, index) => {
      const row = Math.floor(index / zonesPerRow);
      const col = index % zonesPerRow;

      configs[zone.id] = {
        startX: ZONE_GAP + col * (ZONE_WIDTH + ZONE_GAP),
        startY: ZONE_GAP + row * ZONE_ROW_HEIGHT, // Use larger vertical spacing
        columnCount: 2,
        nodeIds: []
      };
    });

    // Track nodes with and without zone affinities
    const assignedNodeIds = new Set<string>();

    // Assign nodes that have affinity data to their best matching zone
    nodeContents.forEach(node => {
      // Skip child nodes (they are rendered inside parent nodes)
      if (node.parentId) return;

      const affinities = nodeAffinities[node.id]; // Get from database

      console.log('[Layout] Processing node for zone assignment:', {
        nodeId: node.id,
        nodeTitle: node.title,
        hasAffinities: !!affinities,
        affinitiesKeys: affinities ? Object.keys(affinities) : [],
        affinities: affinities,
      });

      if (affinities && Object.keys(affinities).length > 0) {
        // Find zone with highest affinity weight
        let bestZone: string | null = null;
        let maxWeight = 0;

        for (const [zoneKey, weight] of Object.entries(affinities)) {
          const numWeight = weight as number;

          // Match zone by zoneKey (affinities are keyed by zoneKey from database)
          const zone = currentFramework.zones.find(z => z.zoneKey === zoneKey);

          if (zone && numWeight > maxWeight && configs[zone.id]) {
            maxWeight = numWeight;
            bestZone = zone.id;
          }
        }

        if (bestZone) {
          configs[bestZone].nodeIds.push(node.id);
          assignedNodeIds.add(node.id);
        }
        // If affinity exists but no matching zone in current framework,
        // node will be unassigned (not added to any zone)
      } else {
        // FALLBACK: For nodes without affinities, assign to first zone as default
        // This ensures all root nodes are visible in the canvas
        const firstZone = currentFramework.zones[0];
        if (firstZone && configs[firstZone.id]) {
          console.log('[Layout] Assigning node without affinities to first zone (fallback):', {
            nodeId: node.id,
            nodeTitle: node.title,
            zoneId: firstZone.id,
          });
          configs[firstZone.id].nodeIds.push(node.id);
          assignedNodeIds.add(node.id);
        }
      }
    });

    // Count root nodes separately
    const rootNodeCount = nodeContents.filter(n => !n.parentId).length;
    const unassignedRootCount = rootNodeCount - assignedNodeIds.size;

    // Debug: Log all zone configs
    const zoneConfigsSummary = Object.entries(configs).map(([zoneId, config]) => {
      const zone = currentFramework.zones.find(z => z.id === zoneId);
      return {
        zoneName: zone?.name || zoneId,
        zoneId,
        nodeCount: config.nodeIds.length,
        nodeIds: config.nodeIds.slice(0, 5), // Only show first 5 to avoid log spam
        allNodeIds: config.nodeIds, // Full list for debugging
      };
    });

    console.log('[Layout] Zone assignment:', {
      frameworkId: currentFramework.id,
      frameworkName: currentFramework.name,
      totalNodes: nodeContents.length,
      rootNodes: rootNodeCount,
      childNodes: nodeContents.length - rootNodeCount,
      assignedNodes: assignedNodeIds.size,
      unassignedRootNodes: unassignedRootCount,
      zoneConfigs: zoneConfigsSummary,
    });

    return configs;
  }, [currentFramework, nodeContents, nodeAffinities]);

  // Zone detection hook for quick node creation
  const detectZone = useZoneDetection(currentFramework, zoneBounds, getDynamicZoneConfigs);

  // Handle background context menu - create node at clicked position
  const handleBackgroundContextMenu = useCallback(
    (x: number, y: number) => {
      console.log('[Background Context Menu] Clicked at Canvas coordinates:', { x, y });

      // Detect which zone contains the click
      const zone = detectZone(x, y);

      console.log('[Background Context Menu] Detected zone:', zone);

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
      console.log('[Quick Node] Creating node', {
        data,
        zone: quickNodeZone,
        frameworkId: currentFramework?.id,
        nodeContentsCount: nodeContents?.length
      });

      // Calculate displayOrder for the zone using nodeContents (database data)
      const displayOrder = calculateNextDisplayOrderInZone(
        nodeContents || [],
        currentFramework?.id || null,
        quickNodeZone?.zoneKey || null
      );

      console.log('[Quick Node] Calculated displayOrder:', displayOrder);

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
      const response = await fetch(`/api/canvas/suggestions/${suggestionId}/apply`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to apply suggestion");
      }

      const result = await response.json();

      // Refresh data first for all types
      const [updatedNodes] = await Promise.all([
        mutate(),
        mutateSuggestions(),
      ]);

      // Handle content-suggestion type - open AI Chat with pre-filled prompt
      if (result.type === "content-suggestion" && result.result?.changes) {
        const { nodeId, prefilledPrompt } = result.result.changes;

        // Find and select the target node from refreshed data
        const targetNode = (updatedNodes || nodeContents).find((n: { id: string }) => n.id === nodeId);
        if (targetNode) {
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
        }
      } else {
        // For other types (add-tag, add-node, etc.)
        // If the current selected node was affected, refresh its data
        if (selectedNode && result.result?.affectedNodeId === selectedNode.id) {
          const updatedNode = (updatedNodes || nodeContents).find((n: { id: string }) => n.id === selectedNode.id);
          if (updatedNode) {
            const fullNode = nodes.find(n => n.id === selectedNode.id);
            if (fullNode) {
              setSelectedNode(fullNode);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Canvas] Failed to apply suggestion:", error);
    }
  }, [nodes, nodeContents, selectedNode, mutate, mutateSuggestions, updateUrl]);

  const handleDismissSuggestion = useCallback(async (suggestionId: string) => {
    try {
      const response = await fetch(`/api/canvas/suggestions/${suggestionId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to dismiss suggestion");
      }

      // Refresh suggestions list
      await mutateSuggestions();
    } catch (error) {
      console.error("[Canvas] Failed to dismiss suggestion:", error);
    }
  }, [mutateSuggestions]);

  const handleGenerateSuggestions = useCallback(async () => {
    if (!projectId || !currentFramework || isGenerating) return;

    setIsGenerating(true);
    setElapsedTime(0);

    // Start timer
    const startTime = Date.now();
    generationTimerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Set timeout (60 seconds)
    const timeoutId = setTimeout(() => {
      if (generationTimerRef.current) {
        clearInterval(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      setIsGenerating(false);
      console.error("[Canvas] Suggestion generation timed out after 60 seconds");
    }, 60000);

    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/canvas/suggestions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          frameworkId: currentFramework.id,
        }),
        signal: controller.signal,
      });

      clearTimeout(fetchTimeout);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to generate suggestions");
      }

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
      const response = await fetch(`/api/canvas/${node.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete node");
      }

      // Revalidate to get fresh data from server
      // Layout logic will handle preserving positions of remaining nodes
      await mutate();
    } catch (error) {
      console.error("Error deleting node:", error);
      alert("删除节点失败，请重试");
    }
  };

  const handleMoveToZone = async (node: CanvasNode, targetZoneKey: string) => {
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
      console.log("[HideNode] Hiding node", {
        nodeId: node.id,
        nodeTitle: node.title,
        frameworkId: currentFramework.id,
      });

      const hiddenInFrameworks = (node as any).hiddenInFrameworks || {};
      const newHiddenState = {
        ...hiddenInFrameworks,
        [currentFramework.id]: true,
      };

      const response = await fetch(`/api/canvas/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenInFrameworks: newHiddenState }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[HideNode] API error:", errorData);
        throw new Error(`API returned ${response.status}: ${JSON.stringify(errorData)}`);
      }

      console.log("[HideNode] Successfully hidden node");

      // Revalidate to update UI by explicitly calling global mutate with the SWR key
      if (projectId) {
        const swrKey = `/api/canvas?projectId=${projectId}`;
        await globalMutate(swrKey);
      }
    } catch (error) {
      console.error("[HideNode] Failed to hide node:", error);
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
      console.log("[RestoreNode] Restoring node", {
        nodeId,
        nodeTitle: node.title,
        frameworkId: currentFramework.id,
      });

      const hiddenInFrameworks = (node as any).hiddenInFrameworks || {};
      const newHiddenState = {
        ...hiddenInFrameworks,
        [currentFramework.id]: false,
      };

      const response = await fetch(`/api/canvas/${nodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiddenInFrameworks: newHiddenState }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[RestoreNode] API error:", errorData);
        throw new Error(`API returned ${response.status}: ${JSON.stringify(errorData)}`);
      }

      console.log("[RestoreNode] Successfully restored node");

      // Revalidate to update UI by explicitly calling global mutate with the SWR key
      if (projectId) {
        const swrKey = `/api/canvas?projectId=${projectId}`;
        await globalMutate(swrKey);
      }
    } catch (error) {
      console.error("[RestoreNode] Failed to restore node:", error);
      alert("恢复节点失败，请重试");
    }
  };

  // Handle framework change
  const handleFrameworkChange = async (framework: ThinkingFramework) => {
    setCurrentFramework(framework);
    // Reset layout to trigger recalculation with new framework
    setLayoutCalculated(false);
    setNodes([]);
    setZoneBounds({});

    // Save framework preference to project
    if (projectId) {
      try {
        await setProjectFramework(framework.id);
        console.log('[Canvas Page] Saved framework preference:', {
          projectId,
          frameworkId: framework.id,
          frameworkName: framework.name,
        });
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
    const affinityHash = JSON.stringify(nodeAffinities);

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
      console.log('[Layout] Affinity changed, triggering smooth layout recalculation');
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
  }, [nodeAffinities, nodes.length]);

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

      console.log('[Layout] Data hash check:', {
        hasDbNodes: !!dbNodes,
        nodeCount: dbNodes.length,
        hasPrevHash: !!prevDataHashRef.current,
        hashChanged: prevDataHashRef.current !== dataHash,
        currentHash: dataHash.substring(0, 150),
        prevHash: prevDataHashRef.current?.substring(0, 150)
      });

      if (prevDataHashRef.current && prevDataHashRef.current !== dataHash) {
        console.log('[Layout] Data changed, updating nodes while preserving positions', {
          prevHash: prevDataHashRef.current.substring(0, 100),
          newHash: dataHash.substring(0, 100)
        });

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
          console.log('[Layout] Nodes added, preserving existing positions');

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
          console.log('[Layout] Nodes removed, triggering layout recalculation');
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
          console.log('[Layout] Initial load, triggering layout calculation');
          setLayoutCalculated(false);
          setNodes([]);
        } else if (displayOrderChanged) {
          // DisplayOrder changed (drag-drop) - need recalculation
          console.log('[Layout] DisplayOrder changed, triggering recalculation');
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
          console.log('[Layout] Only data properties changed, updating without position reset');
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

  // Calculate layout dynamically after nodes are rendered
  useEffect(() => {
    console.log('[Layout] useEffect triggered', {
      layoutCalculated,
      nodeContentsLength: nodeContents.length,
      nodesLength: nodes.length
    });

    if (layoutCalculated) {
      console.log('[Layout] Already calculated, skipping');
      return;
    }

    // Wait for data to load before starting layout calculation
    if (nodeContents.length === 0) {
      console.log('[Layout] No nodeContents yet, waiting for data');
      return;
    }

    // Wait for positions to load from database
    if (positionsLoading) {
      console.log('[Layout] Waiting for positions to load from database');
      return;
    }

    // Wait for affinities to load from database
    if (affinitiesLoading) {
      console.log('[Layout] Waiting for affinities to load from database');
      return;
    }

    // Check if we should load persisted positions (only once)
    if (!positionsLoadedRef.current) {
      const hasPersistedPositions = Object.keys(persistedPositions).length > 0;

      console.log('[Layout] Checking persisted positions', {
        hasPersistedPositions,
        persistedCount: Object.keys(persistedPositions).length,
        nodesLength: nodes.length,
        positionsLoading,
      });

      if (hasPersistedPositions) {
        // Count how many nodes have persisted positions
        const nodesWithPositions = nodeContents.filter(n => persistedPositions[n.id]).length;
        const totalNodes = nodeContents.filter(n => !n.parentId).length; // Only count root nodes

        console.log('[Layout] Checking persisted positions coverage', {
          nodesWithPositions,
          totalNodes,
          coverage: `${Math.round((nodesWithPositions / totalNodes) * 100)}%`,
        });

        // Check if ALL nodes have persisted positions
        const allNodesHavePositions = nodesWithPositions === totalNodes;

        if (allNodesHavePositions) {
          console.log('[Layout] All nodes have persisted positions, using them', {
            count: nodesWithPositions,
          });

          // Use persisted positions for all nodes
          const nodesWithPersistedPositions = nodeContents.map((content) => ({
            ...content,
            position: persistedPositions[content.id] || { x: -9999, y: -9999 },
          }));
          setNodes(nodesWithPersistedPositions);
          setLayoutCalculated(true); // Skip layout calculation
          positionsLoadedRef.current = true;
          return;
        } else if (nodesWithPositions > 0) {
          console.log('[Layout] Some nodes have persisted positions, will calculate positions for missing nodes', {
            withPositions: nodesWithPositions,
            totalNodes,
          });
          // Initialize nodes with persisted positions where available
          // Nodes without positions will be positioned by layout calculation below
          const initialNodes = nodeContents.map((content) => ({
            ...content,
            position: persistedPositions[content.id] || { x: -9999, y: -9999 },
          }));
          setNodes(initialNodes);
          positionsLoadedRef.current = true;
          // Fall through to layout calculation for nodes without positions
        } else {
          console.log('[Layout] No persisted positions, will recalculate all');
          // Fall through to normal layout calculation
        }
      }

      // No persisted positions yet, check if we need to initialize for measurement
      if (nodes.length === 0) {
        console.log('[Layout] No persisted positions, rendering off-screen for measurement');
        // Render off-screen for measurement
        const tempNodes = nodeContents.map((content) => ({
          ...content,
          position: { x: -9999, y: -9999 }, // Off-screen for measurement
        }));
        setNodes(tempNodes);
        return;
      }
    }

    console.log('[Layout] Starting layout calculation via requestAnimationFrame');

    // Wait for next frame to ensure DOM is updated
    requestAnimationFrame(() => {
      // Calculate actual layout based on measured heights
      const calculatedNodes: CanvasNode[] = [];
      const calculatedZoneBounds: Record<string, { width: number; height: number }> = {};

      // Track max height across all zones
      let globalMaxHeight = 0;

      // Get dynamic zone configs based on current framework
      const dynamicZoneConfigs = getDynamicZoneConfigs();

      // Process each zone
      for (const [zoneName, config] of Object.entries(dynamicZoneConfigs)) {
        const currentYInColumn: number[] = Array(config.columnCount).fill(config.startY + 90); // Start from zone's Y position + top padding for zone header

        // Get only root nodes (without parentId) from this zone
        const rootNodeIds = config.nodeIds.filter(nodeId => {
          const content = nodeContents.find(n => n.id === nodeId);
          return content && !content.parentId;
        });

        // Sort by displayOrder to maintain stable positioning
        const sortedRootNodeIds = rootNodeIds.sort((a, b) => {
          const contentA = nodeContents.find(n => n.id === a);
          const contentB = nodeContents.find(n => n.id === b);
          const orderA = contentA?.displayOrder ?? 0;
          const orderB = contentB?.displayOrder ?? 0;
          return orderA - orderB;
        });

        sortedRootNodeIds.forEach((nodeId, index) => {
          const content = nodeContents.find((n) => n.id === nodeId);
          if (!content) return;

          // Use round-robin column assignment for stability
          // This ensures same displayOrder always produces same column
          const currentColumn = index % config.columnCount;
          const x = config.startX + currentColumn * (NODE_WIDTH + COLUMN_GAP);
          const y = currentYInColumn[currentColumn];

          // Get measured height from DOM (includes nested children height)
          const nodeElement = nodeRefs.current.get(nodeId);
          const actualHeight = nodeElement?.offsetHeight || 280; // Fallback to estimated height with children

          calculatedNodes.push({
            ...content,
            position: { x, y },
          });

          // Update column Y position with actual height + reduced gap (since cards are more compact now)
          currentYInColumn[currentColumn] += actualHeight + 30; // Reduced from VERTICAL_GAP (40) to 30
        });

        // Calculate zone bounds based on actual content (relative to zone's start position)
        const maxHeight = Math.max(...currentYInColumn) - config.startY;
        const zoneWidth = config.columnCount * NODE_WIDTH + (config.columnCount - 1) * COLUMN_GAP + 40; // +40 for padding

        calculatedZoneBounds[zoneName] = {
          width: zoneWidth,
          height: maxHeight + 40, // +40 for bottom padding
        };

        // Track global max height
        globalMaxHeight = Math.max(globalMaxHeight, maxHeight + 40);
      }

      // Apply uniform height to all zones (use the tallest zone's height)
      for (const zoneName of Object.keys(calculatedZoneBounds)) {
        calculatedZoneBounds[zoneName].height = globalMaxHeight;
      }

      // Find nodes that are not assigned to any zone (excluding child nodes)
      const assignedNodeIds = new Set(
        Object.values(dynamicZoneConfigs).flatMap(config => config.nodeIds)
      );
      const unassignedRootNodes = nodeContents.filter(
        content => !assignedNodeIds.has(content.id) && !content.parentId
      );

      console.log('[Layout] Node assignment check:', {
        totalNodeContents: nodeContents.length,
        rootNodeContents: nodeContents.filter(n => !n.parentId).length,
        assignedNodeIdsCount: assignedNodeIds.size,
        assignedNodeIds: Array.from(assignedNodeIds),
        unassignedRootNodesCount: unassignedRootNodes.length,
        unassignedRootNodeIds: unassignedRootNodes.map(n => n.id),
      });

      // Place unassigned nodes to the right of all zones
      if (unassignedRootNodes.length > 0 && currentFramework) {
        // Find the rightmost zone edge
        const zoneRightEdges = currentFramework.zones.map((zone, zoneIndex) => {
          const col = zoneIndex % 3;
          const zoneStartX = ZONE_GAP + col * (ZONE_WIDTH + ZONE_GAP);
          const zoneWidth = calculatedZoneBounds[zone.id]?.width || ZONE_WIDTH;
          return zoneStartX + zoneWidth;
        });
        const maxZoneRightEdge = Math.max(...zoneRightEdges, 0);

        const unassignedStartX = maxZoneRightEdge + 100; // 100px gap from zones
        let currentY = ZONE_GAP + 90; // Same starting Y as zones

        unassignedRootNodes.forEach(content => {
          const nodeElement = nodeRefs.current.get(content.id);
          const actualHeight = nodeElement?.offsetHeight || 280;

          calculatedNodes.push({
            ...content,
            position: { x: unassignedStartX, y: currentY },
          });

          currentY += actualHeight + 30; // Same gap as zone nodes
        });

        console.log('[Layout] Placed unassigned nodes:', {
          count: unassignedRootNodes.length,
          startX: unassignedStartX,
          nodeIds: unassignedRootNodes.map(n => n.id),
        });
      }

      // Add all child nodes to calculatedNodes (they won't be positioned, but need to exist in state)
      nodeContents.forEach(content => {
        if (!calculatedNodes.find(n => n.id === content.id)) {
          calculatedNodes.push({
            ...content,
            position: { x: 0, y: 0 }, // Position doesn't matter for child nodes (rendered inside parent)
          });
        }
      });

      console.log('[Layout] Final calculated nodes:', {
        totalCalculated: calculatedNodes.length,
        rootCalculated: calculatedNodes.filter(n => !n.parentId).length,
        childCalculated: calculatedNodes.filter(n => n.parentId).length,
        rootNodeIds: calculatedNodes.filter(n => !n.parentId).map(n => n.id),
      });

      setNodes(calculatedNodes);
      setZoneBounds(calculatedZoneBounds);
      setLayoutCalculated(true);

      // Save calculated positions to database (debounced)
      const positionsToSave = calculatedNodes
        .filter(node => !node.parentId && node.position) // Only save root nodes with positions
        .map(node => ({
          nodeId: node.id,
          x: node.position!.x,
          y: node.position!.y,
        }));

      console.log('[Layout] Saving calculated positions to database (debounced)', {
        count: positionsToSave.length,
      });
      savePositions(positionsToSave);
    });
  }, [nodeContents, nodes.length, layoutCalculated, getDynamicZoneConfigs, savePositions, persistedPositions, currentFramework, positionsLoading, affinitiesLoading]);

  // Node type config
  const nodeTypeConfig = NODE_TYPE_CONFIG;

  // Helper to check if node matches current filter
  const matchesFilter = useCallback((node: CanvasNode): boolean => {
    // 1. Check if hidden in current framework
    if (currentFramework?.id) {
      const hiddenInFrameworks = (node as any).hiddenInFrameworks;
      if (hiddenInFrameworks?.[currentFramework.id] === true) {
        return false; // Hidden nodes don't match filter
      }
    }

    // 2. Check stage filter
    if (stageFilter !== "all") {
      const hasStage = node.tags?.some((tag) => tag === `stage/${stageFilter}`);
      if (!hasStage) return false;
    }

    // 3. Check tag filter (OR logic: match any selected tag)
    if (selectedTags.length > 0) {
      const hasAnyTag = node.tags?.some((tag) => selectedTags.includes(tag));
      if (!hasAnyTag) return false;
    }

    return true;
  }, [currentFramework, stageFilter, selectedTags]);

  // Filter nodes based on current filters (hidden, stage, tags)
  const visibleNodes = useMemo(() => {
    return nodes.filter(matchesFilter);
  }, [nodes, matchesFilter]);

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
        onFrameworkChange={handleFrameworkChange}
        nodes={nodes}
        suggestions={dbSuggestions}
        suggestionsLoading={suggestionsLoading}
        isGenerating={isGenerating}
        elapsedTime={elapsedTime}
        onCreateNode={() => setNodeDialogOpen(true)}
        onGenerateSuggestions={handleGenerateSuggestions}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <CanvasArea
          canvasRef={canvasRef}
          transformRef={transformRef}
          zonesContainerRef={zonesContainerRef}
          nodesContainerRef={nodesContainerRef}
          canvasOffset={canvasOffset}
          scale={scale}
          showStrategicZones={showStrategicZones}
          layoutCalculated={layoutCalculated}
          currentFramework={currentFramework}
          zoneBounds={zoneBounds}
          getDynamicZoneConfigs={getDynamicZoneConfigs}
          allNodes={dbNodes || []}
          visibleNodes={visibleNodes}
          selectedNode={selectedNode}
          nodeTypeConfig={nodeTypeConfig}
          stageFilter={stageFilter}
          nodeRefs={nodeRefs}
          matchesFilter={matchesFilter}
          onCanvasMouseDown={handleCanvasMouseDown}
          onNodeClick={handleNodeClick}
          onOpenAIChat={handleOpenAIChat}
          onAddChild={handleAddChild}
          onDelete={handleDelete}
          onMoveToZone={handleMoveToZone}
          onHideNode={handleHideNode}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
          onFilterChange={setStageFilter}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          onRestoreNode={handleRestoreNode}
          onSelectedNodeChange={setSelectedNode}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          activeNodeId={activeNodeId}
          overNodeId={overNodeId}
          dropPosition={dropPosition}
          onBackgroundContextMenu={handleBackgroundContextMenu}
          suggestionsByNode={suggestionsByNode}
          onApplySuggestion={handleApplySuggestion}
          onDismissSuggestion={handleDismissSuggestion}
        />

        {/* Right Panel */}
        {selectedNode && projectId && (
          <NodeDetailPanel
            selectedNode={selectedNode}
            nodeTypeConfig={nodeTypeConfig}
            nodes={nodes}
            showAIChat={showAIChat}
            commentInput={commentInput}
            projectId={projectId}
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

      {/* Node Dialog */}
      <NodeDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        onSubmit={handleCreateNode}
        title={nodeDialogParentId ? "Add Child Node" : "Create New Node"}
        description={nodeDialogParentId ? "Create a child node under the selected parent." : "Create a new canvas node."}
      />

      {/* Tag Dialog */}
      <TagDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        onSubmit={handleSubmitTag}
        existingTags={tagDialogNodeId ? nodes.find((n) => n.id === tagDialogNodeId)?.tags || [] : []}
      />

      {/* Quick Node Dialog */}
      <QuickNodeDialog
        open={quickNodeDialogOpen}
        onOpenChange={setQuickNodeDialogOpen}
        onSubmit={handleQuickNodeSubmit}
        detectedZone={quickNodeZone}
      />
      </div>
    </DndContext>
  );
}
