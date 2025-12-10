"use client";

import {
  Bot,
  FileText,
  Send,
  Sparkles,
  X,
  Lightbulb,
  CheckSquare,
  Plus,
  MoreHorizontal,
  Tag,
  Clock,
  Calendar,
  User,
  MessageSquare,
  Activity,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SimpleChat } from "@/components/simple-chat";
import type { SimpleChatMessage } from "@/components/simple-chat";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
  ZONE_COLORS,
  type NodeContent,
  type CanvasNode,
  type FeedActivity,
  type Comment,
  type AISuggestion,
  type ThinkingFramework,
} from "./canvas-data";
import { FrameworkSwitcher } from "./components/FrameworkSwitcher";
import { HealthOverview } from "./components/HealthOverview";
import { NodeHealthBadge } from "./components/NodeHealthBadge";
import { HealthPopover } from "./components/HealthPopover";
import { SubscriptionDebugger } from "@/components/SubscriptionDebugger";

type StageFilter = "all" | "ideation" | "research" | "design" | "dev" | "launch";

export default function CanvasPage() {
  // Get node contents (without layout)
  const nodeContents = getAllNodeContents();

  // Dynamic layout state
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [layoutCalculated, setLayoutCalculated] = useState(false);
  const [zoneBounds, setZoneBounds] = useState<Record<string, { width: number; height: number }>>({});

  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [suggestions] = useState<AISuggestion[]>(MOCK_SUGGESTIONS);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Framework switcher state
  const [currentFramework, setCurrentFramework] = useState<ThinkingFramework>(FRAMEWORKS[0]);

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

  // Canvas pan and zoom state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Direct DOM manipulation refs for hybrid architecture
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const zonesContainerRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleAddComment = () => {
    if (!commentInput.trim() || !selectedNode) return;
    // In demo, just clear input
    setCommentInput("");
    // In real app, would add comment to backend
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

  // Canvas pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (selectedNode) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCanvasOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Debounced sync: Update React state after scrolling stops
  const syncStateDebounced = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      setCanvasOffset({ x: transformRef.current.x, y: transformRef.current.y });
      setScale(transformRef.current.scale);
    }, 150);
  }, []);

  // Direct DOM update helper
  const updateTransform = useCallback(() => {
    const transform = `translate(${transformRef.current.x}px, ${transformRef.current.y}px) scale(${transformRef.current.scale})`;
    if (zonesContainerRef.current) {
      zonesContainerRef.current.style.transform = transform;
    }
    if (nodesContainerRef.current) {
      nodesContainerRef.current.style.transform = transform;
    }
  }, []);

  // Calculate layout dynamically after nodes are rendered
  useEffect(() => {
    if (layoutCalculated) return;

    // Initial render: set nodes with temporary positions (off-screen for measurement)
    if (nodes.length === 0) {
      const tempNodes = nodeContents.map((content) => ({
        ...content,
        position: { x: -9999, y: -9999 }, // Off-screen for measurement
      }));
      setNodes(tempNodes);
      return;
    }

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
  }, [nodes, nodeContents, layoutCalculated, getDynamicZoneConfigs]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Initialize transformRef from React state
  useEffect(() => {
    transformRef.current.x = canvasOffset.x;
    transformRef.current.y = canvasOffset.y;
    transformRef.current.scale = scale;
  }, [canvasOffset.x, canvasOffset.y, scale]);

  // Register native wheel listener to avoid passive listener warning
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Cmd/Ctrl + scroll for zoom
      if (e.metaKey || e.ctrlKey) {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        transformRef.current.scale = Math.min(Math.max(transformRef.current.scale * delta, 0.5), 2);
      } else {
        // Default scroll for panning
        transformRef.current.x -= e.deltaX;
        transformRef.current.y -= e.deltaY;
      }

      // Direct DOM update
      updateTransform();

      // Sync React state after scroll stops
      syncStateDebounced();
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, [updateTransform, syncStateDebounced]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Node type config
  const nodeTypeConfig = {
    document: {
      icon: FileText,
      color: "bg-blue-500",
      label: "Document",
      emoji: "📄",
    },
    task: {
      icon: CheckSquare,
      color: "bg-gray-500",
      label: "Task",
      emoji: "☑️",
    },
    idea: {
      icon: Lightbulb,
      color: "bg-yellow-500",
      label: "Idea",
      emoji: "💡",
    },
    inspiration: {
      icon: Sparkles,
      color: "bg-pink-500",
      label: "Inspiration",
      emoji: "💡",
    },
  };

  // Build hierarchy
  const getNodeDepth = (nodeId: string): number => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node?.parentId) return 0;
    return 1 + getNodeDepth(node.parentId);
  };

  // All nodes are always visible (no collapse functionality)
  const visibleNodes = nodes;

  // Helper to check if node matches current filter
  const matchesFilter = (node: CanvasNode): boolean => {
    if (stageFilter === "all") return true;
    return node.tags.some((tag) => tag === `stage/${stageFilter}`);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 shrink-0">
        <div className="flex items-center gap-2">
          <SidebarToggle />
          <Separator orientation="vertical" className="h-4" />
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Project Canvas</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Framework Switcher */}
          <FrameworkSwitcher
            currentFramework={currentFramework}
            onFrameworkChange={handleFrameworkChange}
          />

          <Separator orientation="vertical" className="h-6" />

          {/* Health Overview (now includes suggestions) */}
          <HealthOverview nodes={nodes} suggestions={suggestions} />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden relative bg-muted/5"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => setSelectedNode(null)}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {/* Strategic Zones Background - Dynamic based on current framework */}
          {showStrategicZones && (
            <div
              ref={zonesContainerRef}
              className="absolute pointer-events-none"
              style={{
                left: 0,
                top: 0,
                width: "4000px",
                height: "3000px",
                transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                willChange: "transform",
              }}
            >
              {/* Render zones based on current framework */}
              {layoutCalculated && (() => {
                // Get zone configurations for current framework
                const zoneConfigs = getDynamicZoneConfigs();

                return currentFramework.zones.map((zone) => {
                  // Get zone configuration with grid position
                  const config = zoneConfigs[zone.id];
                  const zoneBound = zoneBounds[zone.id];

                  // Get colors from the palette using colorKey
                  const colors = ZONE_COLORS[zone.colorKey];

                  return (
                    <div
                      key={zone.id}
                      className="absolute border-2 border-dashed rounded-2xl transition-all duration-500"
                      style={{
                        left: config.startX - 20,
                        top: config.startY - 20,
                        width: zoneBound?.width || 800,
                        height: zoneBound?.height || 800,
                        borderColor: `${colors.base}4D`, // 30% opacity for border
                        backgroundColor: `${colors.base}1A`, // 10% opacity for background
                      }}
                    >
                      <div
                        className="absolute top-3 left-4 text-sm font-bold px-3 py-1.5 rounded-lg inline-block text-white shadow-md"
                        style={{
                          backgroundColor: colors.label,
                        }}
                      >
                        {zone.name}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Connection lines removed - using nested cards instead */}

          {/* Nodes */}
          <div
            ref={nodesContainerRef}
            className="absolute inset-0"
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            {visibleNodes.filter((node) => !node.parentId).map((node) => {
              const config = nodeTypeConfig[node.type];
              const Icon = config.icon;
              const isMatching = matchesFilter(node);
              const isHighlighted = stageFilter === "all" || isMatching;

              // Recursive function to render child nodes as nested tree items
              const renderChildren = (parentId: string, level: number = 1): React.ReactNode => {
                const children = visibleNodes.filter((n) => n.parentId === parentId);
                if (children.length === 0) return null;

                return (
                  <div className="">
                    {children.map((child, index) => {
                      const childConfig = nodeTypeConfig[child.type];
                      const grandChildren = visibleNodes.filter((n) => n.parentId === child.id);
                      const isLast = index === children.length - 1;

                      return (
                        <div key={child.id} className="relative pl-6">
                          {/* Tree connector lines */}
                          <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none">
                            {/* Vertical line connecting siblings */}
                            {!isLast && (
                              <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
                            )}
                            {/* L-shaped connector */}
                            <div className="absolute left-[11px] top-0 w-px h-[13px] bg-border" />
                            <div className="absolute left-[11px] top-[12px] w-[13px] h-px bg-border" />
                          </div>

                          <div
                            className="flex items-center gap-2 py-1 px-2 -ml-4 pl-6 rounded-lg hover:bg-muted/50 cursor-pointer group/child transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodeClick(child, e);
                            }}
                          >
                            <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", childConfig.color)} />
                            <span className="text-xs font-medium flex-1 truncate">{child.title}</span>
                            {grandChildren.length > 0 && (
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                +{grandChildren.length}
                              </span>
                            )}
                          </div>

                          {/* Render grandchildren recursively */}
                          {grandChildren.length > 0 && renderChildren(child.id, level + 1)}
                        </div>
                      );
                    })}
                  </div>
                );
              };

              return (
                <HealthPopover key={node.id} node={node}>
                  <div
                    ref={(el) => {
                      if (el) {
                        nodeRefs.current.set(node.id, el);
                      }
                    }}
                    className={cn(
                      "absolute w-80 p-4 bg-background border-2 rounded-xl shadow-sm cursor-pointer group select-none",
                      "transition-all duration-300 ease-out",
                      selectedNode?.id === node.id
                        ? "border-primary shadow-lg scale-105 z-10"
                        : isHighlighted
                          ? "border-border hover:border-primary/50 hover:shadow-md"
                          : "border-border/30 opacity-40 hover:opacity-60",
                    )}
                    style={{
                      left: node.position.x,
                      top: node.position.y,
                      userSelect: "none",
                    }}
                    onClick={(e) => handleNodeClick(node, e)}
                  >
                    {/* Health Badge */}
                    <NodeHealthBadge node={node} />

                    {/* Header */}
                    <div className="flex items-start gap-2 mb-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg shrink-0",
                        config.color.replace("bg-", "bg-") + "/10",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", config.color.replace("bg-", "text-"))} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm leading-snug mb-1">{node.title}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {config.emoji} {config.label}
                        </Badge>
                        {node.children && node.children.length > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal bg-primary/5 text-primary border-primary/20"
                          >
                            {node.children.length} children
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Type-specific content */}
                  {node.type === "task" && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            node.taskStatus === "done" && "bg-green-500/10 text-green-600",
                            node.taskStatus === "in-progress" &&
                              "bg-blue-500/10 text-blue-600",
                            node.taskStatus === "todo" && "bg-gray-500/10 text-gray-600",
                          )}
                        >
                          {node.taskStatus === "done" && "✓ 已完成"}
                          {node.taskStatus === "in-progress" && "⟳ 进行中"}
                          {node.taskStatus === "todo" && "○ 待开始"}
                        </div>
                        {node.assignee && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {node.assignee}
                          </div>
                        )}
                      </div>
                      {node.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          截止 {node.dueDate}
                        </div>
                      )}
                    </div>
                  )}

                  {node.type === "idea" && (
                    <div className="mb-3 p-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                      <p className="text-xs text-yellow-700 dark:text-yellow-500">
                        💡 早期想法，待验证
                      </p>
                    </div>
                  )}

                  {node.type === "inspiration" && (
                    <div className="mb-3 p-2 bg-pink-500/5 border border-pink-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-xs text-pink-600 dark:text-pink-400 mb-1">
                        <Sparkles className="h-3 w-3" />
                        <span className="font-medium">Inspiration</span>
                      </div>
                      {node.source && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>📚 {node.source}</span>
                        </div>
                      )}
                      {node.capturedAt && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {node.capturedAt}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                    {node.content.replace(/[#*]/g, "").trim()}
                  </p>

                  {/* Nested Children */}
                  {renderChildren(node.id)}

                  {/* Tags */}
                  {node.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {node.tags.slice(0, 3).map((tag) => {
                        const [namespace, value] = tag.split("/");
                        const tagColors: Record<string, string> = {
                          type: "bg-blue-500/10 text-blue-600",
                          stage: "bg-green-500/10 text-green-600",
                          priority: "bg-orange-500/10 text-orange-600",
                        };

                        return (
                          <div
                            key={tag}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                              tagColors[namespace] || "bg-muted text-muted-foreground",
                            )}
                          >
                            <Tag className="h-2.5 w-2.5" />
                            {value}
                          </div>
                        );
                      })}
                      {node.tags.length > 3 && (
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                          +{node.tags.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hover Actions */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 bg-background border border-border rounded-lg shadow-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAIChat(node);
                        }}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        CrossMind
                      </Button>
                      <Separator orientation="vertical" className="h-6" />
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Add Child
                      </Button>
                    </div>
                  </div>
                </div>
                </HealthPopover>
              );
            })}
          </div>

          {/* Canvas Controls */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
            {/* Zoom controls */}
            <div className="bg-background border border-border rounded-lg shadow-lg p-2">
              <div className="flex gap-1 items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setScale((s) => Math.min(s * 1.2, 2))}
                >
                  +
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => setScale((s) => Math.max(s * 0.8, 0.5))}
                >
                  −
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setScale(1);
                    setCanvasOffset({ x: 0, y: 0 });
                  }}
                >
                  Reset
                </Button>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <div className="text-xs text-muted-foreground px-2">
                  {stageFilter === "all"
                    ? `${visibleNodes.length} nodes`
                    : `${visibleNodes.filter(matchesFilter).length} / ${visibleNodes.length} nodes`}{" "}
                  • {Math.round(scale * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Stage Filter - Top Left */}
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
            <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-3">
                  <Tag className="h-3.5 w-3.5 mr-1.5" />
                  {stageFilter === "all" && "All Stages"}
                  {stageFilter === "ideation" && "💡 Ideation"}
                  {stageFilter === "research" && "🔍 Research"}
                  {stageFilter === "design" && "📋 Design"}
                  {stageFilter === "dev" && "⚙️ Development"}
                  {stageFilter === "launch" && "🚀 Launch"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <div className="p-1 space-y-0.5">
                  <Button
                    variant={stageFilter === "all" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setStageFilter("all");
                      setIsFilterOpen(false);
                    }}
                  >
                    All Stages
                  </Button>
                  <Button
                    variant={stageFilter === "ideation" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setStageFilter("ideation");
                      setIsFilterOpen(false);
                    }}
                  >
                    💡 Ideation
                  </Button>
                  <Button
                    variant={stageFilter === "research" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setStageFilter("research");
                      setIsFilterOpen(false);
                    }}
                  >
                    🔍 Research
                  </Button>
                  <Button
                    variant={stageFilter === "design" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setStageFilter("design");
                      setIsFilterOpen(false);
                    }}
                  >
                    📋 Design
                  </Button>
                  <Button
                    variant={stageFilter === "dev" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setStageFilter("dev");
                      setIsFilterOpen(false);
                    }}
                  >
                    ⚙️ Development
                  </Button>
                  <Button
                    variant={stageFilter === "launch" ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => {
                      setStageFilter("launch");
                      setIsFilterOpen(false);
                    }}
                  >
                    🚀 Launch
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>

        {/* Right Panel */}
        {selectedNode && (
          <div
            className="w-[600px] flex flex-col bg-background border-l border-border shadow-2xl shrink-0 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b shrink-0 bg-muted/10">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    nodeTypeConfig[selectedNode.type].color.replace("bg-", "bg-") + "/10",
                  )}
                >
                  {React.createElement(nodeTypeConfig[selectedNode.type].icon, {
                    className: cn(
                      "h-4 w-4",
                      nodeTypeConfig[selectedNode.type].color.replace("bg-", "text-"),
                    ),
                  })}
                </div>
                <div>
                  <h2 className="font-semibold text-sm">{selectedNode.title}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {nodeTypeConfig[selectedNode.type].emoji}{" "}
                      {nodeTypeConfig[selectedNode.type].label}
                    </Badge>
                    {selectedNode.tags.slice(0, 2).map((tag) => {
                      const [, value] = tag.split("/");
                      return (
                        <span key={tag} className="text-[10px] text-muted-foreground">
                          #{value}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={!showAIChat ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => setShowAIChat(false)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Document
                  </Button>
                  <Button
                    variant={showAIChat ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => setShowAIChat(true)}
                  >
                    <Bot className="h-3 w-3 mr-1" />
                    AI Chat
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClosePanel();
                    setShowAIChat(false);
                  }}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {!showAIChat ? (
                /* Document Content */
                <div className="flex-1 p-6 overflow-y-auto border-r border-border/40 bg-card/30">
                {/* Breadcrumb for child nodes */}
                {selectedNode.parentId && (() => {
                  // Build breadcrumb path
                  const buildBreadcrumb = (nodeId: string): CanvasNode[] => {
                    const current = nodes.find(n => n.id === nodeId);
                    if (!current) return [];
                    if (!current.parentId) return [current];
                    return [...buildBreadcrumb(current.parentId), current];
                  };

                  const breadcrumbPath = buildBreadcrumb(selectedNode.id);
                  // Remove the last item (current node) from breadcrumb
                  const parentPath = breadcrumbPath.slice(0, -1);

                  return parentPath.length > 0 ? (
                    <div className="mb-4 pb-4 border-b border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                        {parentPath.map((ancestor, index) => (
                          <React.Fragment key={ancestor.id}>
                            <button
                              className="hover:text-foreground transition-colors truncate max-w-[150px]"
                              onClick={() => {
                                const ancestorNode = nodes.find(n => n.id === ancestor.id);
                                if (ancestorNode) handleNodeClick(ancestorNode, {} as React.MouseEvent);
                              }}
                            >
                              {ancestor.title}
                            </button>
                            {index < parentPath.length - 1 && (
                              <span className="text-muted-foreground/50">/</span>
                            )}
                          </React.Fragment>
                        ))}
                        <span className="text-muted-foreground/50">/</span>
                        <span className="text-foreground font-medium truncate max-w-[150px]">
                          {selectedNode.title}
                        </span>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Type-specific metadata */}
                {selectedNode.type === "task" && (
                  <div className="mb-6 p-4 bg-background/60 border border-border/50 rounded-lg space-y-3">
                    <h4 className="text-xs font-medium text-muted-foreground mb-3">
                      Task Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge
                          variant={
                            selectedNode.taskStatus === "done" ? "default" : "secondary"
                          }
                        >
                          {selectedNode.taskStatus === "done" && "Done"}
                          {selectedNode.taskStatus === "in-progress" && "In Progress"}
                          {selectedNode.taskStatus === "todo" && "To Do"}
                        </Badge>
                      </div>
                      {selectedNode.assignee && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Assignee</span>
                          <span>{selectedNode.assignee}</span>
                        </div>
                      )}
                      {selectedNode.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Due Date</span>
                          <span>{selectedNode.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedNode.type === "idea" && (
                  <div className="mb-6 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <h4 className="text-xs font-medium text-yellow-700 dark:text-yellow-500 mb-2">
                      💡 Early-stage Idea
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      This is an unvalidated creative idea that can be refined with AI assistance or converted to a formal document for in-depth design.
                    </p>
                  </div>
                )}

                {selectedNode.type === "inspiration" && (
                  <div className="mb-6 p-4 bg-pink-500/5 border border-pink-500/20 rounded-lg">
                    <h4 className="text-xs font-medium text-pink-600 dark:text-pink-400 mb-2 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" />
                      Inspiration Captured
                    </h4>
                    <div className="space-y-2 text-sm">
                      {selectedNode.source && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Source</span>
                          <span className="text-pink-600 dark:text-pink-400">
                            {selectedNode.source}
                          </span>
                        </div>
                      )}
                      {selectedNode.capturedAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Captured At</span>
                          <span>{selectedNode.capturedAt}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 p-2 bg-background/50 rounded border border-pink-500/10">
                      💡 Tip: This inspiration can be transformed into a document or used as a reference for ideas
                    </p>
                  </div>
                )}

                {/* Document Content */}
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-pre:bg-muted prose-pre:text-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, href, children, ...props }) => {
                        // Handle node reference links [[node-id]]
                        if (href?.startsWith('#')) {
                          const nodeId = href.slice(1);
                          return (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNodeReferenceClick(nodeId);
                              }}
                              className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                              {...props}
                            >
                              {children}
                            </a>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      },
                    }}
                  >
                    {processContentWithReferences(selectedNode.content)}
                  </ReactMarkdown>
                </div>

                {/* Tags Section */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.tags.map((tag) => {
                      const [namespace, value] = tag.split("/");
                      return (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {namespace}/{value}
                        </Badge>
                      );
                    })}
                    <Button variant="outline" size="sm" className="h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                </div>

                {/* Activity & Comments Timeline */}
                <div className="mt-6 pt-6 border-t border-border/50">
                  <h4 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    Activity & Comments
                  </h4>
                  <div className="space-y-3 mb-4">
                    {(() => {
                      // Merge activities and comments into unified timeline
                      const activities = getFeedActivities(selectedNode.id);
                      const comments = getComments(selectedNode.id);

                      // Convert comments to activity format
                      const commentActivities = comments.map((comment) => ({
                        id: comment.id,
                        type: "comment" as const,
                        user: comment.user,
                        timestamp: comment.timestamp,
                        content: comment.content,
                      }));

                      // Combine and sort by timestamp (newest first)
                      const timeline = [...activities, ...commentActivities].sort((a, b) => {
                        // Simple timestamp comparison (assumes format like "2 hours ago", "1 day ago")
                        return b.id.localeCompare(a.id); // Fallback to ID for stable sort
                      });

                      if (timeline.length === 0) {
                        return (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            No activity yet
                          </div>
                        );
                      }

                      return timeline.map((item) => {
                        if (item.type === "comment") {
                          // Render comment
                          return (
                            <div key={item.id} className="flex gap-2">
                              <Avatar className="h-6 w-6 border border-border shrink-0 mt-0.5">
                                <AvatarFallback className="text-[10px]">
                                  {item.user.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5 mb-1">
                                  <span className="text-xs font-medium">{item.user}</span>
                                  <span className="text-[11px] text-muted-foreground/60">
                                    commented {item.timestamp}
                                  </span>
                                </div>
                                <div className="text-xs text-foreground/90 leading-relaxed wrap-break-word bg-muted/30 p-2 rounded">
                                  {item.content.split(/(@\w+)/g).map((part, i) =>
                                    part.startsWith("@") ? (
                                      <span key={i} className="text-primary font-medium">
                                        {part}
                                      </span>
                                    ) : (
                                      <span key={i}>{part}</span>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Render activity
                          return (
                            <div key={item.id} className="flex gap-2 text-xs">
                              <div className="shrink-0 mt-0.5">
                                {item.type === "created" && (
                                  <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Plus className="h-3 w-3 text-blue-500" />
                                  </div>
                                )}
                                {item.type === "updated" && (
                                  <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <FileText className="h-3 w-3 text-green-500" />
                                  </div>
                                )}
                                {item.type === "status_changed" && (
                                  <div className="h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <CheckSquare className="h-3 w-3 text-purple-500" />
                                  </div>
                                )}
                                {item.type === "tag_added" && (
                                  <div className="h-5 w-5 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <Tag className="h-3 w-3 text-orange-500" />
                                  </div>
                                )}
                                {item.type === "comment_added" && (
                                  <div className="h-5 w-5 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <MessageSquare className="h-3 w-3 text-cyan-500" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-medium text-foreground">{item.user}</span>
                                  <span className="text-muted-foreground">{item.description}</span>
                                </div>
                                {item.details && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {item.details}
                                  </div>
                                )}
                                <div className="text-[11px] text-muted-foreground/60 mt-1 flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {item.timestamp}
                                </div>
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>

                  {/* Comment Input */}
                  <div className="relative">
                    <Input
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                      placeholder="Add a comment... (@ to mention)"
                      className="pr-9 h-9 text-xs"
                    />
                    <Button
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7"
                      variant="ghost"
                      onClick={handleAddComment}
                      disabled={!commentInput.trim()}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              ) : (
                /* AI Chat Interface */
                <SimpleChat
                  messages={aiChatHistory}
                  input={aiInput}
                  onInputChange={setAiInput}
                  onSend={handleSendAIMessage}
                  emptyStateTitle="Chat with CrossMind AI"
                  emptyStateDescription="CrossMind AI can help you analyze documents, provide suggestions, and generate content. The current document reference is attached in the input box."
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subscription Debugger */}
      <SubscriptionDebugger />
    </div>
  );
}
