/**
 * Canvas Layout Hook
 * Handles dynamic layout calculation for canvas nodes
 */

import { useCallback, useState, useRef, useEffect } from "react";
import type { NodeContent, CanvasNode, ThinkingFramework, ZoneConfig } from "../lib/canvas-types";

const NODE_WIDTH = 400;
const VERTICAL_GAP = 20;
const COLUMN_GAP = 20;

interface UseCanvasLayoutProps {
  nodeContents: NodeContent[];
  currentFramework: ThinkingFramework;
}

export function useCanvasLayout({ nodeContents, currentFramework }: UseCanvasLayoutProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [layoutCalculated, setLayoutCalculated] = useState(false);
  const [zoneBounds, setZoneBounds] = useState<Record<string, { width: number; height: number }>>({});
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /**
   * Generate dynamic zone configs based on current framework
   */
  const getDynamicZoneConfigs = useCallback(() => {
    const configs: Record<string, ZoneConfig> = {};
    const zoneCount = currentFramework.zones.length;
    const ZONE_WIDTH = 800;
    const ZONE_GAP = 20;
    const ZONE_ROW_HEIGHT = 1000;

    // Smart layout: if more than 5 zones, use grid layout
    let zonesPerRow = zoneCount;
    if (zoneCount > 5) {
      zonesPerRow = zoneCount <= 8 ? 4 : 3;
    }

    // Initialize zone configs with grid positions
    currentFramework.zones.forEach((zone, index) => {
      const row = Math.floor(index / zonesPerRow);
      const col = index % zonesPerRow;

      configs[zone.id] = {
        startX: ZONE_GAP + col * (ZONE_WIDTH + ZONE_GAP),
        startY: ZONE_GAP + row * ZONE_ROW_HEIGHT,
        columnCount: 2,
        nodeIds: [],
      };
    });

    // Assign each node to the best matching zone based on affinity weights
    nodeContents.forEach((node) => {
      const affinities = node.zoneAffinities?.[currentFramework.id];

      if (affinities) {
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
        // Default to first zone if no affinity data
        configs[currentFramework.zones[0].id].nodeIds.push(node.id);
      }
    });

    return configs;
  }, [nodeContents, currentFramework]);

  /**
   * Calculate layout positions for all nodes
   */
  const calculateLayout = useCallback(() => {
    if (nodeContents.length === 0) {
      setNodes([]);
      setLayoutCalculated(true);
      return;
    }

    const zoneConfigs = getDynamicZoneConfigs();
    const newNodes: CanvasNode[] = [];
    const newZoneBounds: Record<string, { width: number; height: number }> = {};

    // First pass: place nodes off-screen for measurement
    nodeContents.forEach((nodeContent) => {
      newNodes.push({
        ...nodeContent,
        x: -9999,
        y: 0,
        width: NODE_WIDTH,
        height: 200, // Default height
      });
    });

    setNodes(newNodes);
    setLayoutCalculated(false);

    // Wait for next frame to measure heights
    requestAnimationFrame(() => {
      const measuredNodes: CanvasNode[] = [];

      for (const [zoneId, config] of Object.entries(zoneConfigs)) {
        const columnHeights = Array(config.columnCount).fill(0);
        const zoneNodes = config.nodeIds
          .map((id) => nodeContents.find((n) => n.id === id))
          .filter(Boolean) as NodeContent[];

        zoneNodes.forEach((nodeContent) => {
          const element = nodeRefs.current.get(nodeContent.id);
          const height = element?.offsetHeight || 200;

          // Find shortest column (greedy bin packing)
          const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
          const x = config.startX + shortestCol * (NODE_WIDTH + COLUMN_GAP);
          const y = config.startY + columnHeights[shortestCol];

          measuredNodes.push({
            ...nodeContent,
            x,
            y,
            width: NODE_WIDTH,
            height,
            zoneId,
          });

          columnHeights[shortestCol] += height + VERTICAL_GAP;
        });

        // Record zone bounds
        const maxHeight = Math.max(...columnHeights);
        newZoneBounds[zoneId] = {
          width: config.columnCount * NODE_WIDTH + (config.columnCount - 1) * COLUMN_GAP,
          height: maxHeight,
        };
      }

      setNodes(measuredNodes);
      setZoneBounds(newZoneBounds);
      setLayoutCalculated(true);
    });
  }, [nodeContents, getDynamicZoneConfigs]);

  // Recalculate layout when dependencies change
  useEffect(() => {
    calculateLayout();
  }, [calculateLayout]);

  return {
    nodes,
    layoutCalculated,
    zoneBounds,
    nodeRefs,
    recalculateLayout: calculateLayout,
  };
}
