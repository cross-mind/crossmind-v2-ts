"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CanvasControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  nodeCount: number;
  totalNodeCount: number;
}

export function CanvasControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  nodeCount,
  totalNodeCount,
}: CanvasControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="bg-background border border-border rounded-lg shadow-lg p-2">
        <div className="flex gap-1 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={onZoomIn}
          >
            +
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={onZoomOut}
          >
            −
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7"
            onClick={onReset}
          >
            Reset
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <div className="text-xs text-muted-foreground px-2">
            {nodeCount === totalNodeCount
              ? `${totalNodeCount} nodes`
              : `${nodeCount} / ${totalNodeCount} nodes`}{" "}
            • {Math.round(scale * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
