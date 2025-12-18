"use client";

/**
 * CanvasRoot Component
 *
 * Root container that provides all Canvas contexts to child components.
 * Wraps CanvasProvider, FilterProvider, and SuggestionProvider.
 */

import React from "react";
import { CanvasProvider } from "../core/CanvasContext";
import { FilterProvider } from "../features/filters/FilterContext";
import { SuggestionProvider } from "../features/suggestions/SuggestionContext";
import { NODE_TYPE_CONFIG } from "../node-type-config";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import type { CanvasNode as DBCanvasNode, CanvasSuggestion } from "@/lib/db/schema";

export interface CanvasRootProps {
  children: React.ReactNode;

  // Canvas state
  nodes: CanvasNode[];
  allNodes: DBCanvasNode[];
  currentFramework: ThinkingFramework | null;
  frameworks: ThinkingFramework[];
  projectId: string | null;
  layoutCalculated: boolean;
  zoneBounds: Record<string, { width: number; height: number }>;

  // Suggestion state
  suggestionsByNode: Map<string, CanvasSuggestion[]>;
  isGenerating?: boolean;
  elapsedTime?: number;

  // Node operation handlers
  onNodeDelete?: (node: CanvasNode) => Promise<void>;
  onNodeMoveToZone?: (node: CanvasNode, zoneKey: string) => Promise<void>;
  onNodeHide?: (node: CanvasNode) => Promise<void>;
  onNodeRestore?: (nodeId: string) => Promise<void>;
  onFrameworkChange?: (framework: ThinkingFramework) => Promise<void>;

  // Suggestion handlers
  onApplySuggestion?: (suggestionId: string) => Promise<void>;
  onDismissSuggestion?: (suggestionId: string) => Promise<void>;
}

export function CanvasRoot({
  children,
  nodes,
  allNodes,
  currentFramework,
  frameworks,
  projectId,
  layoutCalculated,
  zoneBounds,
  suggestionsByNode,
  isGenerating = false,
  elapsedTime = 0,
  onNodeDelete,
  onNodeMoveToZone,
  onNodeHide,
  onNodeRestore,
  onFrameworkChange,
  onApplySuggestion,
  onDismissSuggestion,
}: CanvasRootProps) {
  return (
    <CanvasProvider
      initialNodes={nodes}
      initialAllNodes={allNodes}
      initialFramework={currentFramework}
      frameworks={frameworks}
      nodeTypeConfig={NODE_TYPE_CONFIG}
      projectId={projectId}
      initialLayoutCalculated={layoutCalculated}
      initialZoneBounds={zoneBounds}
      onNodeDelete={onNodeDelete}
      onNodeMoveToZone={onNodeMoveToZone}
      onNodeHide={onNodeHide}
      onNodeRestore={onNodeRestore}
      onFrameworkChange={onFrameworkChange}
    >
      <FilterProvider>
        <SuggestionProvider
          suggestionsByNode={suggestionsByNode}
          isGenerating={isGenerating}
          elapsedTime={elapsedTime}
          onApplySuggestion={onApplySuggestion}
          onDismissSuggestion={onDismissSuggestion}
        >
          {children}
        </SuggestionProvider>
      </FilterProvider>
    </CanvasProvider>
  );
}
