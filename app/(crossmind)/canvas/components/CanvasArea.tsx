"use client";

import React, { useLayoutEffect } from "react";
import { StrategicZones } from "./StrategicZones";
import { CanvasNodeCard } from "./CanvasNodeCard";
import { CanvasControls } from "./CanvasControls";
import { StageFilter } from "./StageFilter";
import { TagFilter } from "./TagFilter";
import { HiddenNodesDropdown } from "./HiddenNodesDropdown";
import { CanvasBackgroundContextMenu } from "./CanvasBackgroundContextMenu";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import type { DropPosition } from "../lib/drag-drop-helpers";
import { useCanvas } from "../core/CanvasContext";
import { useFilter } from "../features/filters/FilterContext";
import { useSuggestions } from "../features/suggestions/SuggestionContext";

interface CanvasAreaProps {
  // Refs (must stay as props)
  canvasRef: React.RefObject<HTMLDivElement>;
  transformRef: React.RefObject<HTMLDivElement>;
  zonesContainerRef: React.RefObject<HTMLDivElement>;
  nodesContainerRef: React.RefObject<HTMLDivElement>;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;

  // Zoom/Pan state (from useZoomPan)
  canvasOffset: { x: number; y: number };
  scale: number;

  // UI state (local to page)
  showStrategicZones: boolean;
  getDynamicZoneConfigs: () => Record<string, { startX: number; startY: number; columnCount: number; nodeIds: string[] }>;

  // Event handlers (specific to page)
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (parentNode: CanvasNode) => void;
  onGenerateNodeSuggestions: (node: CanvasNode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onWheel?: (e: WheelEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseUp?: () => void;
  onBackgroundContextMenu?: (x: number, y: number) => void;

  // Drag-drop state (from useDragDrop)
  activeNodeId?: string | null;
  overNodeId?: string | null;
  dropPosition?: DropPosition;

  // Suggestion generation state
  generatingNodeId?: string | null;
}

export function CanvasArea({
  canvasRef,
  transformRef,
  zonesContainerRef,
  nodesContainerRef,
  nodeRefs,
  canvasOffset,
  scale,
  showStrategicZones,
  getDynamicZoneConfigs,
  onCanvasMouseDown,
  onNodeClick,
  onOpenAIChat,
  onAddChild,
  onGenerateNodeSuggestions,
  onZoomIn,
  onZoomOut,
  onReset,
  onWheel,
  onMouseMove,
  onMouseUp,
  onBackgroundContextMenu,
  activeNodeId,
  overNodeId,
  dropPosition,
  generatingNodeId,
}: CanvasAreaProps) {
  // Access state from Context
  const {
    allNodes,
    selectedNode,
    layoutCalculated,
    currentFramework,
    zoneBounds,
    nodeTypeConfig,
    selectNode,
    deleteNode,
    moveToZone,
    hideNode,
    restoreNode,
  } = useCanvas();

  const {
    visibleNodes,
    stageFilter,
    selectedTags,
    setStageFilter,
    setSelectedTags,
    matchesFilter,
  } = useFilter();

  const {
    suggestionsByNode,
    applySuggestion,
    dismissSuggestion,
  } = useSuggestions();
  // Setup event listeners in this component where refs are actually attached
  useLayoutEffect(() => {
    const container = canvasRef.current;

    if (!container) {
      console.log('[CanvasArea] canvasRef not ready yet');
      return;
    }

    console.log('[CanvasArea] Setting up event listeners');

    // Attach optional handlers from useZoomPan hook
    if (onWheel) {
      container.addEventListener("wheel", onWheel, { passive: false });
    }
    if (onMouseMove) {
      document.addEventListener("mousemove", onMouseMove);
    }
    if (onMouseUp) {
      document.addEventListener("mouseup", onMouseUp);
    }

    console.log('[CanvasArea] Event listeners attached successfully');

    return () => {
      console.log('[CanvasArea] Cleaning up event listeners');
      if (onWheel) {
        container.removeEventListener("wheel", onWheel);
      }
      if (onMouseMove) {
        document.removeEventListener("mousemove", onMouseMove);
      }
      if (onMouseUp) {
        document.removeEventListener("mouseup", onMouseUp);
      }
    };
  }, [canvasRef, onWheel, onMouseMove, onMouseUp]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 overflow-hidden relative bg-muted/5"
      onMouseDown={onCanvasMouseDown}
      onClick={() => selectNode(null)}
      style={{ cursor: "grab" }}
    >
      {/* Fixed grid background - outside transform container */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Unified transform container for zones and nodes */}
      <CanvasBackgroundContextMenu
        onCreateNode={onBackgroundContextMenu || (() => {})}
        transformRef={transformRef}
        zoom={scale}
        panX={canvasOffset.x}
        panY={canvasOffset.y}
      >
        <div
          ref={transformRef}
          className="absolute inset-0"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          {/* Strategic Zones Background - offset and scale handled by parent container */}
          <div ref={zonesContainerRef} className="absolute inset-0 z-0">
            <StrategicZones
              showStrategicZones={showStrategicZones}
              canvasOffset={{ x: 0, y: 0 }}
              scale={1}
              layoutCalculated={layoutCalculated}
              currentFramework={currentFramework}
              zoneBounds={zoneBounds}
              getDynamicZoneConfigs={getDynamicZoneConfigs}
              overNodeId={overNodeId || null}
            />
          </div>

          {/* Nodes */}
          <div ref={nodesContainerRef} className="absolute inset-0 z-10">
          {visibleNodes.filter((node) => !node.parentId).map((node) => (
            <CanvasNodeCard
              key={node.id}
              node={node}
              visibleNodes={visibleNodes}
              selectedNodeId={selectedNode?.id || null}
              nodeTypeConfig={nodeTypeConfig}
              currentFramework={currentFramework}
              onNodeClick={onNodeClick}
              onOpenAIChat={onOpenAIChat}
              onAddChild={onAddChild}
              onDelete={deleteNode}
              onMoveToZone={moveToZone}
              onHideNode={hideNode}
              onGenerateNodeSuggestions={onGenerateNodeSuggestions}
              onNodeRefSet={(id, el) => {
                if (el) {
                  nodeRefs.current.set(id, el);
                }
              }}
              matchesFilter={matchesFilter}
              stageFilter={stageFilter}
              nodeSuggestions={suggestionsByNode.get(node.id) || []}
              onApplySuggestion={applySuggestion}
              onDismissSuggestion={dismissSuggestion}
              overNodeId={overNodeId}
              dropPosition={dropPosition}
              generatingNodeId={generatingNodeId}
            />
          ))}
          </div>
        </div>
      </CanvasBackgroundContextMenu>

      {/* Canvas Controls */}
      <CanvasControls
        scale={scale}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onReset={onReset}
        nodeCount={stageFilter === "all" ? visibleNodes.length : visibleNodes.filter(matchesFilter).length}
        totalNodeCount={visibleNodes.length}
      />

      {/* Filter Bar - Top Left */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {/* Stage Filter */}
        <div className="bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
          <StageFilter currentFilter={stageFilter} onFilterChange={setStageFilter} />
        </div>

        {/* Tag Filter */}
        <div className="bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
          <TagFilter nodes={allNodes} selectedTags={selectedTags} onTagsChange={setSelectedTags} />
        </div>

        {/* Hidden Nodes Dropdown */}
        <div className="bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
          <HiddenNodesDropdown
            nodes={allNodes}
            currentFrameworkId={currentFramework?.id || null}
            onRestoreNode={restoreNode}
          />
        </div>
      </div>
    </div>
  );
}
