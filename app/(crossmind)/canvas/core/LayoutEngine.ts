/**
 * Layout Engine for Canvas
 *
 * Provides pure functions for calculating node positions and zone layouts.
 * All layout logic is centralized here for testability and maintainability.
 */

import type { NodeContent, CanvasNode, ThinkingFramework, ZoneConfig } from "../canvas-data";

// Layout constants
export const LAYOUT_CONSTANTS = {
  ZONE_WIDTH: 800,
  ZONE_GAP: 20,
  ZONE_ROW_HEIGHT: 1000,
  NODE_WIDTH: 320,
  COLUMN_GAP: 80,
  VERTICAL_GAP: 30, // Reduced from 40 for more compact layout
  ZONE_HEADER_HEIGHT: 90,
  ZONE_PADDING: 40,
  UNASSIGNED_GAP: 100, // Gap between zones and unassigned nodes
} as const;

/**
 * Zone configuration with position and assigned nodes
 */
export interface ZoneLayoutConfig {
  startX: number;
  startY: number;
  columnCount: number;
  nodeIds: string[];
}

/**
 * Calculate how many zones should be per row based on total zone count
 */
function calculateZonesPerRow(zoneCount: number): number {
  if (zoneCount <= 5) return zoneCount;
  if (zoneCount <= 8) return 4;
  return 3;
}

/**
 * Calculate zone grid positions
 */
export function calculateZoneConfigs(
  framework: ThinkingFramework,
  nodeContents: NodeContent[],
  nodeAffinities: Record<string, Record<string, number>>
): Record<string, ZoneLayoutConfig> {
  const { ZONE_WIDTH, ZONE_GAP, ZONE_ROW_HEIGHT } = LAYOUT_CONSTANTS;
  const configs: Record<string, ZoneLayoutConfig> = {};

  const zoneCount = framework.zones.length;
  const zonesPerRow = calculateZonesPerRow(zoneCount);

  // Initialize zone configs with grid positions
  framework.zones.forEach((zone, index) => {
    const row = Math.floor(index / zonesPerRow);
    const col = index % zonesPerRow;

    configs[zone.id] = {
      startX: ZONE_GAP + col * (ZONE_WIDTH + ZONE_GAP),
      startY: ZONE_GAP + row * ZONE_ROW_HEIGHT,
      columnCount: 2,
      nodeIds: []
    };
  });

  // Track assigned nodes
  const assignedNodeIds = new Set<string>();

  // Assign nodes based on affinities
  nodeContents.forEach(node => {
    // Skip child nodes (rendered inside parent)
    if (node.parentId) return;

    const affinities = nodeAffinities[node.id];

    if (affinities && Object.keys(affinities).length > 0) {
      // Find zone with highest affinity
      let bestZone: string | null = null;
      let maxWeight = 0;

      for (const [zoneKey, weight] of Object.entries(affinities)) {
        const numWeight = weight as number;
        const zone = framework.zones.find(z => z.zoneKey === zoneKey);

        if (zone && numWeight > maxWeight && configs[zone.id]) {
          maxWeight = numWeight;
          bestZone = zone.id;
        }
      }

      if (bestZone) {
        configs[bestZone].nodeIds.push(node.id);
        assignedNodeIds.add(node.id);
      }
    } else {
      // Fallback: assign to first zone
      const firstZone = framework.zones[0];
      if (firstZone && configs[firstZone.id]) {
        configs[firstZone.id].nodeIds.push(node.id);
        assignedNodeIds.add(node.id);
      }
    }
  });

  return configs;
}

/**
 * Calculate positions for nodes within zones
 */
export function calculateNodesInZones(
  nodeContents: NodeContent[],
  zoneConfigs: Record<string, ZoneLayoutConfig>,
  nodeRefs: Map<string, HTMLDivElement>
): {
  nodes: CanvasNode[];
  zoneBounds: Record<string, { width: number; height: number }>;
  globalMaxHeight: number;
} {
  const { NODE_WIDTH, COLUMN_GAP, VERTICAL_GAP, ZONE_HEADER_HEIGHT, ZONE_PADDING } = LAYOUT_CONSTANTS;
  const calculatedNodes: CanvasNode[] = [];
  const calculatedZoneBounds: Record<string, { width: number; height: number }> = {};
  let globalMaxHeight = 0;

  // Process each zone
  for (const [zoneName, config] of Object.entries(zoneConfigs)) {
    const currentYInColumn: number[] = Array(config.columnCount).fill(
      config.startY + ZONE_HEADER_HEIGHT
    );

    // Get root nodes only
    const rootNodeIds = config.nodeIds.filter(nodeId => {
      const content = nodeContents.find(n => n.id === nodeId);
      return content && !content.parentId;
    });

    // Sort by displayOrder for stable positioning
    const sortedRootNodeIds = rootNodeIds.sort((a, b) => {
      const contentA = nodeContents.find(n => n.id === a);
      const contentB = nodeContents.find(n => n.id === b);
      const orderA = contentA?.displayOrder ?? 0;
      const orderB = contentB?.displayOrder ?? 0;
      return orderA - orderB;
    });

    // Position nodes using round-robin column assignment
    sortedRootNodeIds.forEach((nodeId, index) => {
      const content = nodeContents.find(n => n.id === nodeId);
      if (!content) return;

      const currentColumn = index % config.columnCount;
      const x = config.startX + currentColumn * (NODE_WIDTH + COLUMN_GAP);
      const y = currentYInColumn[currentColumn];

      // Get measured height from DOM
      const nodeElement = nodeRefs.get(nodeId);
      const actualHeight = nodeElement?.offsetHeight || 280;

      calculatedNodes.push({
        ...content,
        position: { x, y },
      });

      currentYInColumn[currentColumn] += actualHeight + VERTICAL_GAP;
    });

    // Calculate zone bounds
    const maxHeight = Math.max(...currentYInColumn) - config.startY;
    const zoneWidth = config.columnCount * NODE_WIDTH + (config.columnCount - 1) * COLUMN_GAP + ZONE_PADDING;

    calculatedZoneBounds[zoneName] = {
      width: zoneWidth,
      height: maxHeight + ZONE_PADDING,
    };

    globalMaxHeight = Math.max(globalMaxHeight, maxHeight + ZONE_PADDING);
  }

  // Apply uniform height to all zones
  for (const zoneName of Object.keys(calculatedZoneBounds)) {
    calculatedZoneBounds[zoneName].height = globalMaxHeight;
  }

  return { nodes: calculatedNodes, zoneBounds: calculatedZoneBounds, globalMaxHeight };
}

/**
 * Calculate positions for unassigned nodes (nodes not in any zone)
 */
export function calculateUnassignedNodes(
  nodeContents: NodeContent[],
  zoneConfigs: Record<string, ZoneLayoutConfig>,
  framework: ThinkingFramework,
  zoneBounds: Record<string, { width: number; height: number }>,
  nodeRefs: Map<string, HTMLDivElement>
): CanvasNode[] {
  const { ZONE_GAP, ZONE_HEADER_HEIGHT, VERTICAL_GAP, UNASSIGNED_GAP } = LAYOUT_CONSTANTS;
  const unassignedNodes: CanvasNode[] = [];

  // Find unassigned root nodes
  const assignedNodeIds = new Set(
    Object.values(zoneConfigs).flatMap(config => config.nodeIds)
  );
  const unassignedRootNodes = nodeContents.filter(
    content => !assignedNodeIds.has(content.id) && !content.parentId
  );

  if (unassignedRootNodes.length === 0) {
    return [];
  }

  // Find rightmost zone edge
  const zoneRightEdges = framework.zones.map((zone, zoneIndex) => {
    const col = zoneIndex % 3;
    const zoneStartX = ZONE_GAP + col * (LAYOUT_CONSTANTS.ZONE_WIDTH + ZONE_GAP);
    const zoneWidth = zoneBounds[zone.id]?.width || LAYOUT_CONSTANTS.ZONE_WIDTH;
    return zoneStartX + zoneWidth;
  });
  const maxZoneRightEdge = Math.max(...zoneRightEdges, 0);

  const unassignedStartX = maxZoneRightEdge + UNASSIGNED_GAP;
  let currentY = ZONE_GAP + ZONE_HEADER_HEIGHT;

  unassignedRootNodes.forEach(content => {
    const nodeElement = nodeRefs.get(content.id);
    const actualHeight = nodeElement?.offsetHeight || 280;

    unassignedNodes.push({
      ...content,
      position: { x: unassignedStartX, y: currentY },
    });

    currentY += actualHeight + VERTICAL_GAP;
  });

  return unassignedNodes;
}

/**
 * Main layout calculation function
 * Combines all layout logic into a single, testable function
 */
export function calculateNodePositions(
  nodeContents: NodeContent[],
  framework: ThinkingFramework | null,
  nodeAffinities: Record<string, Record<string, number>>,
  nodeRefs: Map<string, HTMLDivElement>
): {
  nodes: CanvasNode[];
  zoneBounds: Record<string, { width: number; height: number }>;
} {
  if (!framework || nodeContents.length === 0) {
    return { nodes: [], zoneBounds: {} };
  }

  // Step 1: Calculate zone configurations
  const zoneConfigs = calculateZoneConfigs(framework, nodeContents, nodeAffinities);

  // Step 2: Calculate positions for nodes in zones
  const { nodes: zonesNodes, zoneBounds, globalMaxHeight } = calculateNodesInZones(
    nodeContents,
    zoneConfigs,
    nodeRefs
  );

  // Step 3: Calculate positions for unassigned nodes
  const unassignedNodes = calculateUnassignedNodes(
    nodeContents,
    zoneConfigs,
    framework,
    zoneBounds,
    nodeRefs
  );

  // Step 4: Combine all nodes
  const allCalculatedNodes = [...zonesNodes, ...unassignedNodes];

  // Step 5: Add child nodes (don't need positions, rendered inside parents)
  nodeContents.forEach(content => {
    if (!allCalculatedNodes.find(n => n.id === content.id)) {
      allCalculatedNodes.push({
        ...content,
        position: { x: 0, y: 0 },
      });
    }
  });

  return {
    nodes: allCalculatedNodes,
    zoneBounds,
  };
}

/**
 * Check if nodes have persisted positions
 */
export function hasPersistedPositions(
  nodeContents: NodeContent[],
  persistedPositions: Record<string, { x: number; y: number }>
): { hasAll: boolean; hasSome: boolean; coverage: number } {
  const rootNodes = nodeContents.filter(n => !n.parentId);
  const nodesWithPositions = rootNodes.filter(n => persistedPositions[n.id]).length;
  const totalNodes = rootNodes.length;

  return {
    hasAll: nodesWithPositions === totalNodes && totalNodes > 0,
    hasSome: nodesWithPositions > 0,
    coverage: totalNodes > 0 ? nodesWithPositions / totalNodes : 0,
  };
}

/**
 * Apply persisted positions to nodes
 */
export function applyPersistedPositions(
  nodeContents: NodeContent[],
  persistedPositions: Record<string, { x: number; y: number }>
): CanvasNode[] {
  return nodeContents.map(content => ({
    ...content,
    position: persistedPositions[content.id] || { x: -9999, y: -9999 },
  }));
}
