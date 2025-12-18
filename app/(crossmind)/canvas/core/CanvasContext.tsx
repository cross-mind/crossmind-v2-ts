"use client";

/**
 * Canvas Context
 *
 * Provides main canvas state and actions to all child components.
 * Eliminates props drilling and centralizes canvas state management.
 */

import React, { createContext, useContext, useCallback, useState, useMemo, useEffect } from "react";
import type { CanvasNode, ThinkingFramework } from "../canvas-data";
import type { NODE_TYPE_CONFIG } from "../node-type-config";

export interface CanvasState {
  // Data
  nodes: CanvasNode[];
  selectedNode: CanvasNode | null;
  allNodes: CanvasNode[]; // All nodes from database (including hidden)
  projectId: string | null;

  // Layout
  layoutCalculated: boolean;
  zoneBounds: Record<string, { width: number; height: number }>;

  // Framework
  currentFramework: ThinkingFramework | null;
  frameworks: ThinkingFramework[];

  // Node type config
  nodeTypeConfig: typeof NODE_TYPE_CONFIG;

  // Actions
  selectNode: (node: CanvasNode | null) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setLayoutCalculated: (calculated: boolean) => void;
  setZoneBounds: (bounds: Record<string, { width: number; height: number }>) => void;
  setCurrentFramework: (framework: ThinkingFramework) => void;

  // Node operations
  deleteNode: (node: CanvasNode) => Promise<void>;
  moveToZone: (node: CanvasNode, zoneKey: string) => Promise<void>;
  hideNode: (node: CanvasNode) => Promise<void>;
  restoreNode: (nodeId: string) => Promise<void>;
}

const CanvasContext = createContext<CanvasState | null>(null);

export interface CanvasProviderProps {
  children: React.ReactNode;
  initialNodes?: CanvasNode[];
  initialAllNodes?: CanvasNode[];
  initialFramework?: ThinkingFramework | null;
  frameworks?: ThinkingFramework[];
  nodeTypeConfig: typeof NODE_TYPE_CONFIG;
  projectId: string | null;
  initialLayoutCalculated?: boolean;
  initialZoneBounds?: Record<string, { width: number; height: number }>;
  onNodeDelete?: (node: CanvasNode) => Promise<void>;
  onNodeMoveToZone?: (node: CanvasNode, zoneKey: string) => Promise<void>;
  onNodeHide?: (node: CanvasNode) => Promise<void>;
  onNodeRestore?: (nodeId: string) => Promise<void>;
  onFrameworkChange?: (framework: ThinkingFramework) => Promise<void>;
}

export function CanvasProvider({
  children,
  initialNodes = [],
  initialAllNodes = [],
  initialFramework = null,
  frameworks = [],
  nodeTypeConfig,
  projectId,
  initialLayoutCalculated = false,
  initialZoneBounds = {},
  onNodeDelete,
  onNodeMoveToZone,
  onNodeHide,
  onNodeRestore,
  onFrameworkChange,
}: CanvasProviderProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [layoutCalculated, setLayoutCalculated] = useState(initialLayoutCalculated);
  const [zoneBounds, setZoneBounds] = useState<Record<string, { width: number; height: number }>>(initialZoneBounds);
  const [currentFramework, setCurrentFrameworkState] = useState<ThinkingFramework | null>(initialFramework);

  // Update internal state when props change
  useEffect(() => {
    if (initialFramework) {
      setCurrentFrameworkState(initialFramework);
    }
  }, [initialFramework]);

  // Sync nodes from external state (when layout calculation completes)
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [initialNodes]);

  // Sync layoutCalculated and zoneBounds from external state
  useEffect(() => {
    setLayoutCalculated(initialLayoutCalculated);
    setZoneBounds(initialZoneBounds);
  }, [initialLayoutCalculated, initialZoneBounds]);

  const selectNode = useCallback((node: CanvasNode | null) => {
    setSelectedNode(node);
  }, []);

  const setCurrentFramework = useCallback(async (framework: ThinkingFramework) => {
    setCurrentFrameworkState(framework);
    if (onFrameworkChange) {
      await onFrameworkChange(framework);
    }
  }, [onFrameworkChange]);

  const deleteNode = useCallback(async (node: CanvasNode) => {
    if (onNodeDelete) {
      await onNodeDelete(node);
    }
  }, [onNodeDelete]);

  const moveToZone = useCallback(async (node: CanvasNode, zoneKey: string) => {
    if (onNodeMoveToZone) {
      await onNodeMoveToZone(node, zoneKey);
    }
  }, [onNodeMoveToZone]);

  const hideNode = useCallback(async (node: CanvasNode) => {
    if (onNodeHide) {
      await onNodeHide(node);
    }
  }, [onNodeHide]);

  const restoreNode = useCallback(async (nodeId: string) => {
    if (onNodeRestore) {
      await onNodeRestore(nodeId);
    }
  }, [onNodeRestore]);

  const value = useMemo<CanvasState>(
    () => ({
      nodes,
      selectedNode,
      allNodes: initialAllNodes,
      projectId,
      layoutCalculated,
      zoneBounds,
      currentFramework,
      frameworks,
      nodeTypeConfig,
      selectNode,
      setNodes,
      setLayoutCalculated,
      setZoneBounds,
      setCurrentFramework,
      deleteNode,
      moveToZone,
      hideNode,
      restoreNode,
    }),
    [
      nodes,
      selectedNode,
      initialAllNodes,
      projectId,
      layoutCalculated,
      zoneBounds,
      currentFramework,
      frameworks,
      nodeTypeConfig,
      selectNode,
      setCurrentFramework,
      deleteNode,
      moveToZone,
      hideNode,
      restoreNode,
    ]
  );

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within CanvasProvider");
  }
  return context;
}
