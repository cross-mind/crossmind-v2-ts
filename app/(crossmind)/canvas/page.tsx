"use client";

import {
  Plus,
  Tag,
  Sparkles,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { SimpleChatMessage } from "@/components/simple-chat";
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
  MOCK_FEED,
  MOCK_COMMENTS,
  MOCK_SUGGESTIONS,
  FRAMEWORKS,
  type NodeContent,
  type CanvasNode,
  type FeedActivity,
  type Comment,
  type AISuggestion,
  type ThinkingFramework,
} from "./canvas-data";
import { SubscriptionDebugger } from "@/components/SubscriptionDebugger";
import { NodeDetailPanel } from "./components/NodeDetailPanel";
import { type StageFilterType } from "./components/StageFilter";
import { CanvasHeader } from "./components/CanvasHeader";
import { CanvasArea } from "./components/CanvasArea";
import { NODE_TYPE_CONFIG } from "./node-type-config";
import { extractStageFromTags } from "./lib/canvas-helpers";
import { useCanvasNodes } from "@/hooks/use-canvas-nodes";
import type { CanvasNode as DBCanvasNode } from "@/lib/db/schema";
import { NodeDialog } from "./components/NodeDialog";
import { TagDialog } from "./components/TagDialog";
import { useCanvasActions } from "./hooks/useCanvasActions";
import { useZoomPan } from "./hooks/useZoomPan";

export default function CanvasPage() {
  // Get projectId from URL
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  // Fetch real Canvas nodes from database
  const { nodes: dbNodes, isLoading, isError } = useCanvasNodes(projectId);

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
    }));
  }, [dbNodes, projectId, isLoading, isError]);

  // Dynamic layout state
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layoutCalculated, setLayoutCalculated] = useState(false);
  const [zoneBounds, setZoneBounds] = useState<Record<string, { width: number; height: number }>>({});

  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [suggestions] = useState<AISuggestion[]>(MOCK_SUGGESTIONS);
  const [stageFilter, setStageFilter] = useState<StageFilterType>("all");

  // Framework switcher state
  const [currentFramework, setCurrentFramework] = useState<ThinkingFramework>(FRAMEWORKS[0]);

  // Canvas actions hook (handles node creation, tags, comments)
  const {
    nodeDialogOpen,
    setNodeDialogOpen,
    nodeDialogParentId,
    handleAddChild,
    handleCreateNode,
    tagDialogOpen,
    setTagDialogOpen,
    tagDialogNodeId,
    handleAddTag,
    handleSubmitTag,
    commentInput,
    setCommentInput,
    handleAddComment,
  } = useCanvasActions({ projectId, nodes });

  // Generate dynamic zone configs based on current framework
  const getDynamicZoneConfigs = useCallback(() => {
    const configs: Record<string, { startX: number; startY: number; columnCount: number; nodeIds: string[] }> = {};

    const zoneCount = currentFramework.zones.length;
    const ZONE_WIDTH = 800;
    const ZONE_GAP = 20;
    const ZONE_ROW_HEIGHT = 1000; // Increased vertical space per row to prevent overlap

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

    // Assign each node to the best matching zone based on affinity weights
    nodeContents.forEach(node => {
      const affinities = node.zoneAffinities?.[currentFramework.id];

      if (affinities) {
        // Find zone with highest affinity
        let bestZone = currentFramework.zones[0].id;
        let maxWeight = 0;

        for (const [zoneId, weight] of Object.entries(affinities)) {
          if (weight > maxWeight && configs[zoneId]) {
            maxWeight = weight;
            bestZone = zoneId;
          }
        }

        configs[bestZone].nodeIds.push(node.id);
      } else {
        // Fallback: distribute nodes without affinity data evenly across zones
        const zoneCount = currentFramework.zones.length;
        const nodeIndex = nodeContents.indexOf(node);
        const assignedZoneIndex = nodeIndex % zoneCount;
        const fallbackZone = currentFramework.zones[assignedZoneIndex].id;
        configs[fallbackZone].nodeIds.push(node.id);
      }
    });

    return configs;
  }, [currentFramework, nodeContents]);

  // AI Chat state
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<SimpleChatMessage[]>([]);

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

  // These refs are still needed for layout calculations
  const zonesContainerRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);

  const handleNodeClick = (node: CanvasNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
    setShowAIChat(false); // Reset to document view when selecting a node
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
    setShowAIChat(false); // Reset AI chat state when closing panel
  };

  const getFeedActivities = (nodeId: string): FeedActivity[] => {
    return MOCK_FEED[nodeId] || [];
  };

  const getComments = (nodeId: string): Comment[] => {
    return MOCK_COMMENTS[nodeId] || [];
  };

  const handleOpenAIChat = (node: CanvasNode) => {
    setSelectedNode(node);
    setShowAIChat(true);
    // Attach document reference to input
    const reference = `📄 Reference Document: "${node.title}"\n\n`;
    setAiInput(reference);
  };

  const handleSendAIMessage = () => {
    if (!aiInput.trim()) return;
    // In demo, just add to history
    setAiChatHistory([...aiChatHistory, { role: "user", content: aiInput }]);
    setAiInput("");
    // In real app, would send to AI backend
  };

  // Handle framework change
  const handleFrameworkChange = (framework: ThinkingFramework) => {
    setCurrentFramework(framework);
    // Reset layout to trigger recalculation with new framework
    setLayoutCalculated(false);
    setNodes([]);
    setZoneBounds({});
  };

  // Handle node reference click [[node-id]]
  const handleNodeReferenceClick = (nodeId: string) => {
    const referencedNode = nodes.find((n) => n.id === nodeId);
    if (referencedNode) {
      setSelectedNode(referencedNode);
      setShowAIChat(false);
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

    // Initial render: set nodes with temporary positions (off-screen for measurement)
    if (nodes.length === 0) {
      const tempNodes = nodeContents.map((content) => ({
        ...content,
        position: { x: -9999, y: -9999 }, // Off-screen for measurement
      }));
      setNodes(tempNodes);
      return;
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

        rootNodeIds.forEach((nodeId) => {
          const content = nodeContents.find((n) => n.id === nodeId);
          if (!content) return;

          // Find the shortest column to place the next node (greedy algorithm for better balance)
          const currentColumn = currentYInColumn.indexOf(Math.min(...currentYInColumn));
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

      // Add all child nodes to calculatedNodes (they won't be positioned, but need to exist in state)
      nodeContents.forEach(content => {
        if (!calculatedNodes.find(n => n.id === content.id)) {
          calculatedNodes.push({
            ...content,
            position: { x: 0, y: 0 }, // Position doesn't matter for child nodes (rendered inside parent)
          });
        }
      });

      setNodes(calculatedNodes);
      setZoneBounds(calculatedZoneBounds);
      setLayoutCalculated(true);
    });
  }, [nodeContents, nodes.length, layoutCalculated, getDynamicZoneConfigs]);

  // Node type config
  const nodeTypeConfig = NODE_TYPE_CONFIG;

  // All nodes are always visible (no collapse functionality)
  const visibleNodes = nodes;

  // Helper to check if node matches current filter
  const matchesFilter = (node: CanvasNode): boolean => {
    if (stageFilter === "all") return true;
    return node.tags.some((tag) => tag === `stage/${stageFilter}`);
  };

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
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <CanvasHeader
        currentFramework={currentFramework}
        onFrameworkChange={handleFrameworkChange}
        nodes={nodes}
        suggestions={suggestions}
        onCreateNode={() => setNodeDialogOpen(true)}
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
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleZoomReset}
          onFilterChange={setStageFilter}
          onSelectedNodeChange={setSelectedNode}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />

        {/* Right Panel */}
        {selectedNode && (
          <NodeDetailPanel
            selectedNode={selectedNode}
            nodeTypeConfig={nodeTypeConfig}
            nodes={nodes}
            showAIChat={showAIChat}
            commentInput={commentInput}
            aiChatHistory={aiChatHistory}
            aiInput={aiInput}
            onClose={handleClosePanel}
            onSetShowAIChat={setShowAIChat}
            onNodeClick={handleNodeClick}
            onAddTag={handleAddTag}
            onCommentInputChange={setCommentInput}
            onAddComment={() => selectedNode && handleAddComment(selectedNode.id)}
            onAiInputChange={setAiInput}
            onSendAIMessage={handleSendAIMessage}
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
    </div>
  );
}
