"use client";

/**
 * Filter Context
 *
 * Manages filter state (stage, tags) for Canvas nodes.
 * Provides filter logic and filtered node lists.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { CanvasNode, ThinkingFramework } from "../../canvas-data";

export type StageFilterType = "all" | "ideation" | "research" | "design" | "dev" | "launch";

export interface FilterState {
  // Filter state
  stageFilter: StageFilterType;
  selectedTags: string[];

  // Filtered data
  visibleNodes: CanvasNode[];

  // Actions
  setStageFilter: (filter: StageFilterType) => void;
  setSelectedTags: (tags: string[]) => void;
  matchesFilter: (node: CanvasNode) => boolean;
}

const FilterContext = createContext<FilterState | null>(null);

export interface FilterProviderProps {
  children: React.ReactNode;
  nodes: CanvasNode[];
  currentFramework: ThinkingFramework | null;
}

export function FilterProvider({ children, nodes, currentFramework }: FilterProviderProps) {
  const [stageFilter, setStageFilter] = useState<StageFilterType>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const matchesFilter = useCallback(
    (node: CanvasNode): boolean => {
      // 1. Check if hidden in current framework
      if (currentFramework?.id) {
        const hiddenInFrameworks = (node as any).hiddenInFrameworks;
        if (hiddenInFrameworks?.[currentFramework.id] === true) {
          return false;
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
    },
    [currentFramework, stageFilter, selectedTags]
  );

  const visibleNodes = useMemo(() => {
    return nodes.filter(matchesFilter);
  }, [nodes, matchesFilter]);

  const value = useMemo<FilterState>(
    () => ({
      stageFilter,
      selectedTags,
      visibleNodes,
      setStageFilter,
      setSelectedTags,
      matchesFilter,
    }),
    [stageFilter, selectedTags, visibleNodes, matchesFilter]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilter must be used within FilterProvider");
  }
  return context;
}
