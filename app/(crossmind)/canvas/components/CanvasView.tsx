/**
 * Canvas View Component
 * Main canvas visualization with nodes and zones
 */

import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useZoomPan } from "../hooks/useZoomPan";
import { useCanvasLayout } from "../hooks/useCanvasLayout";
import { CanvasNodeCard } from "./CanvasNodeCard";
import type { NodeContent, ThinkingFramework, CanvasNode } from "../lib/canvas-types";
import { FRAMEWORKS, ZONE_COLORS } from "../canvas-data";

interface CanvasViewProps {
  nodeContents: NodeContent[];
  currentFramework: ThinkingFramework;
  selectedNode: CanvasNode | null;
  onNodeSelect: (node: CanvasNode | null) => void;
}

export function CanvasView({
  nodeContents,
  currentFramework,
  selectedNode,
  onNodeSelect,
}: CanvasViewProps) {
  const { zoom, transformRef, handleMouseDown, handleZoomIn, handleZoomOut, handleResetView } =
    useZoomPan();

  const { nodes, layoutCalculated, zoneBounds, nodeRefs } = useCanvasLayout({
    nodeContents,
    currentFramework,
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/20">
      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <Button variant="outline" size="icon" onClick={handleZoomIn}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleResetView}>
          Reset
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          {nodes.length} nodes • {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Canvas Container */}
      <div
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div
          ref={transformRef}
          style={{
            transform: "translate(0px, 0px) scale(1)",
            transformOrigin: "0 0",
            transition: "none",
          }}
          className="relative"
        >
          {/* Zone Backgrounds */}
          {layoutCalculated &&
            currentFramework.zones.map((zone) => {
              const config = zoneBounds[zone.id];
              if (!config) return null;

              // Find first node in this zone to get position
              const firstNode = nodes.find((n) => n.zoneId === zone.id);
              if (!firstNode) return null;

              return (
                <div
                  key={zone.id}
                  className="absolute rounded-lg border-2 border-dashed"
                  style={{
                    left: `${firstNode.x - 10}px`,
                    top: `${firstNode.y - 60}px`,
                    width: `${config.width + 20}px`,
                    height: `${config.height + 70}px`,
                    backgroundColor: `${zone.color}10`,
                    borderColor: `${zone.color}40`,
                  }}
                >
                  <div
                    className="absolute -top-8 left-2 text-sm font-medium"
                    style={{ color: zone.color }}
                  >
                    {zone.name}
                  </div>
                </div>
              );
            })}

          {/* Nodes */}
          {nodes.map((node) => (
            <CanvasNodeCard
              key={node.id}
              node={node}
              isSelected={selectedNode?.id === node.id}
              onClick={() => onNodeSelect(node)}
              nodeRef={(el) => {
                if (el) {
                  nodeRefs.current.set(node.id, el);
                } else {
                  nodeRefs.current.delete(node.id);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
