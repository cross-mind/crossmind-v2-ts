"use client";

import React, { useLayoutEffect } from "react";
import { StrategicZones } from "./StrategicZones";
import { CanvasNodeCard } from "./CanvasNodeCard";
import { CanvasControls } from "./CanvasControls";
import { StageFilter, type StageFilterType } from "./StageFilter";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import type { NODE_TYPE_CONFIG } from "../node-type-config";
import type { DropPosition } from "../lib/drag-drop-helpers";

interface CanvasAreaProps {
  canvasRef: React.RefObject<HTMLDivElement>;
  transformRef: React.RefObject<HTMLDivElement>;
  zonesContainerRef: React.RefObject<HTMLDivElement>;
  nodesContainerRef: React.RefObject<HTMLDivElement>;
  canvasOffset: { x: number; y: number };
  scale: number;
  showStrategicZones: boolean;
  layoutCalculated: boolean;
  currentFramework: ThinkingFramework;
  zoneBounds: Record<string, { width: number; height: number }>;
  getDynamicZoneConfigs: () => Record<string, { startX: number; startY: number; columnCount: number; nodeIds: string[] }>;
  visibleNodes: CanvasNode[];
  selectedNode: CanvasNode | null;
  nodeTypeConfig: typeof NODE_TYPE_CONFIG;
  stageFilter: StageFilterType;
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  matchesFilter: (node: CanvasNode) => boolean;
  onCanvasMouseDown: (e: React.MouseEvent) => void;
  onNodeClick: (node: CanvasNode, e: React.MouseEvent) => void;
  onOpenAIChat: (node: CanvasNode) => void;
  onAddChild: (parentNode: CanvasNode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFilterChange: (filter: StageFilterType) => void;
  onSelectedNodeChange: (node: CanvasNode | null) => void;
  onWheel?: (e: WheelEvent) => void; // Optional wheel handler from useZoomPan
  onMouseMove?: (e: MouseEvent) => void; // Optional mouse move handler
  onMouseUp?: () => void; // Optional mouse up handler
  // Drag-drop state
  activeNodeId?: string | null;
  overNodeId?: string | null;
  dropPosition?: DropPosition;
}

export function CanvasArea({
  canvasRef,
  transformRef,
  zonesContainerRef,
  nodesContainerRef,
  canvasOffset,
  scale,
  showStrategicZones,
  layoutCalculated,
  currentFramework,
  zoneBounds,
  getDynamicZoneConfigs,
  visibleNodes,
  selectedNode,
  nodeTypeConfig,
  stageFilter,
  nodeRefs,
  matchesFilter,
  onCanvasMouseDown,
  onNodeClick,
  onOpenAIChat,
  onAddChild,
  onZoomIn,
  onZoomOut,
  onReset,
  onFilterChange,
  onSelectedNodeChange,
  onWheel,
  onMouseMove,
  onMouseUp,
  activeNodeId,
  overNodeId,
  dropPosition,
}: CanvasAreaProps) {
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
      onClick={() => onSelectedNodeChange(null)}
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
        <div ref={zonesContainerRef}>
          <StrategicZones
            showStrategicZones={showStrategicZones}
            canvasOffset={{ x: 0, y: 0 }}
            scale={1}
            layoutCalculated={layoutCalculated}
            currentFramework={currentFramework}
            zoneBounds={zoneBounds}
            getDynamicZoneConfigs={getDynamicZoneConfigs}
          />
        </div>

        {/* Nodes */}
        <div ref={nodesContainerRef} className="absolute inset-0">
        {visibleNodes.filter((node) => !node.parentId).map((node) => (
          <CanvasNodeCard
            key={node.id}
            node={node}
            visibleNodes={visibleNodes}
            selectedNodeId={selectedNode?.id || null}
            nodeTypeConfig={nodeTypeConfig}
            onNodeClick={onNodeClick}
            onOpenAIChat={onOpenAIChat}
            onAddChild={onAddChild}
            onNodeRefSet={(id, el) => {
              if (el) {
                nodeRefs.current.set(id, el);
              }
            }}
            matchesFilter={matchesFilter}
            stageFilter={stageFilter}
            overNodeId={overNodeId}
            dropPosition={dropPosition}
          />
        ))}
        </div>
      </div>

      {/* Canvas Controls */}
      <CanvasControls
        scale={scale}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onReset={onReset}
        nodeCount={stageFilter === "all" ? visibleNodes.length : visibleNodes.filter(matchesFilter).length}
        totalNodeCount={visibleNodes.length}
      />

      {/* Stage Filter - Top Left */}
      <StageFilter
        currentFilter={stageFilter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
