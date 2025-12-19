/**
 * Layout Engine for Canvas
 *
 * Provides pure functions for calculating node positions and zone layouts.
 * All layout logic is centralized here for testability and maintainability.
 */

import type { NodeContent, CanvasNode, ThinkingFramework, ZoneConfig } from "../canvas-data";

// Layout constants
export const LAYOUT_CONSTANTS = {
  // Zone layout
  ZONE_WIDTH: 800,              // Zone container width
  ZONE_GAP: 20,                 // Horizontal spacing between zones
  ZONE_ROW_GAP: 80,             // Vertical spacing between zone rows

  // Node layout
  NODE_WIDTH: 320,              // Node card width
  COLUMN_GAP: 80,               // Horizontal spacing between columns within zone
  VERTICAL_GAP: 30,             // Vertical spacing between nodes (reduced from 40 for compact layout)

  // Zone internals
  ZONE_HEADER_HEIGHT: 90,       // Zone title area height
  ZONE_PADDING: 40,             // Padding inside zone bounds

  // Unassigned nodes area
  UNASSIGNED_GAP: 100,          // Gap between zones and unassigned nodes
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
 * Row layout information for per-row height calculation
 */
interface ZoneRowLayout {
  rowIndex: number;       // Row index (0, 1, 2...)
  zoneIds: string[];      // Zone IDs in this row
  startY: number;         // Top Y coordinate of this row
  maxHeight: number;      // Maximum zone height in this row
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
 * Calculate zone grid positions and row groupings
 */
export function calculateZoneConfigs(
  framework: ThinkingFramework,
  nodeContents: NodeContent[],
  nodeAffinities: Record<string, Record<string, number>>
): {
  configs: Record<string, ZoneLayoutConfig>;
  rowGroups: ZoneRowLayout[];
} {
  const { ZONE_WIDTH, ZONE_GAP } = LAYOUT_CONSTANTS;
  const configs: Record<string, ZoneLayoutConfig> = {};
  const rowMap = new Map<number, string[]>();  // Track which zones belong to which row

  const zoneCount = framework.zones.length;
  const zonesPerRow = calculateZonesPerRow(zoneCount);

  // Initialize zone configs with grid positions (temporary Y = 0)
  framework.zones.forEach((zone, index) => {
    const row = Math.floor(index / zonesPerRow);
    const col = index % zonesPerRow;

    configs[zone.id] = {
      startX: ZONE_GAP + col * (ZONE_WIDTH + ZONE_GAP),
      startY: 0,  // Temporary value, will be calculated based on row heights
      columnCount: 2,
      nodeIds: []
    };

    // Track which zone belongs to which row
    if (!rowMap.has(row)) {
      rowMap.set(row, []);
    }
    rowMap.get(row)!.push(zone.id);
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
      // Note: If no affinity found, node remains unassigned
      // It will be handled by calculateUnassignedNodes()
    }
  });

  // Build row groups
  const rowGroups: ZoneRowLayout[] = [];
  rowMap.forEach((zoneIds, rowIndex) => {
    rowGroups.push({
      rowIndex,
      zoneIds,
      startY: 0,        // Will be calculated after measuring zone heights
      maxHeight: 0,     // Will be calculated after measuring zone heights
    });
  });

  return { configs, rowGroups };
}

/**
 * Calculate positions for nodes within zones, applying per-row uniform heights
 */
export function calculateNodesInZones(
  nodeContents: NodeContent[],
  zoneConfigs: Record<string, ZoneLayoutConfig>,
  rowGroups: ZoneRowLayout[],
  nodeRefs: Map<string, HTMLDivElement>,
  framework: ThinkingFramework | null
): {
  nodes: CanvasNode[];
  zoneBounds: Record<string, { width: number; height: number }>;
  rowGroups: ZoneRowLayout[];
} {
  const { NODE_WIDTH, COLUMN_GAP, VERTICAL_GAP, ZONE_HEADER_HEIGHT, ZONE_PADDING } = LAYOUT_CONSTANTS;
  const MIN_ZONE_HEIGHT = 170;  // Minimum zone height: Header(90) + Padding(40*2)
  const calculatedNodes: CanvasNode[] = [];
  const calculatedZoneBounds: Record<string, { width: number; height: number }> = {};

  // Process each zone
  for (const [zoneName, config] of Object.entries(zoneConfigs)) {
    const currentYInColumn: number[] = Array(config.columnCount).fill(
      config.startY + ZONE_HEADER_HEIGHT
    );

    // Get root nodes only, excluding hidden nodes in current framework
    const rootNodeIds = config.nodeIds.filter(nodeId => {
      const content = nodeContents.find(n => n.id === nodeId);
      if (!content || content.parentId) return false;

      // Check if hidden in current framework
      if (framework?.id) {
        const hiddenInFrameworks = (content as any).hiddenInFrameworks;
        if (hiddenInFrameworks?.[framework.id] === true) {
          return false;
        }
      }

      return true;
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

    // Calculate zone bounds with minimum height constraint
    const maxHeight = Math.max(...currentYInColumn) - config.startY;
    const zoneWidth = config.columnCount * NODE_WIDTH + (config.columnCount - 1) * COLUMN_GAP + ZONE_PADDING;

    calculatedZoneBounds[zoneName] = {
      width: zoneWidth,
      height: Math.max(maxHeight + ZONE_PADDING, MIN_ZONE_HEIGHT),
    };
  }

  // Apply per-row uniform heights
  const uniformRowGroups = applyRowUniformHeights(rowGroups, calculatedZoneBounds);

  // Calculate cumulative row Y offsets
  const finalRowGroups = calculateRowYOffsets(uniformRowGroups);

  // Apply uniform heights to zone bounds (within each row)
  for (const row of finalRowGroups) {
    for (const zoneId of row.zoneIds) {
      if (calculatedZoneBounds[zoneId]) {
        calculatedZoneBounds[zoneId].height = row.maxHeight;
      }
    }
  }

  return { nodes: calculatedNodes, zoneBounds: calculatedZoneBounds, rowGroups: finalRowGroups };
}

/**
 * Apply uniform height to zones within each row
 * @param rowGroups - Row grouping information
 * @param zoneBounds - Measured zone heights
 * @returns Updated row groups with maxHeight calculated
 */
function applyRowUniformHeights(
  rowGroups: ZoneRowLayout[],
  zoneBounds: Record<string, { width: number; height: number }>
): ZoneRowLayout[] {
  return rowGroups.map((row) => {
    // Calculate max height among all zones in this row
    const maxHeight = Math.max(
      ...row.zoneIds.map((zoneId) => zoneBounds[zoneId]?.height || 0),
      0
    );

    return {
      ...row,
      maxHeight,  // Uniform height for this row
    };
  });
}

/**
 * Calculate cumulative Y offsets for zone rows
 * @param rowGroups - Row groupings (with maxHeight calculated)
 * @returns Updated row groups with startY calculated
 */
function calculateRowYOffsets(
  rowGroups: ZoneRowLayout[]
): ZoneRowLayout[] {
  const { ZONE_GAP, ZONE_ROW_GAP } = LAYOUT_CONSTANTS;
  let currentY = ZONE_GAP;  // Start from top gap

  return rowGroups.map((row) => {
    const updatedRow = {
      ...row,
      startY: currentY,
    };

    // Next row starts at: current Y + current row height + row gap
    currentY += row.maxHeight + ZONE_ROW_GAP;

    return updatedRow;
  });
}

/**
 * Apply calculated row Y offsets to zone configs and node positions
 * @param zoneConfigs - Zone configurations
 * @param rowGroups - Row groups with startY calculated
 * @param nodes - Node positions
 * @returns Updated configs and nodes with correct Y coordinates
 */
function applyRowYOffsetsToZones(
  zoneConfigs: Record<string, ZoneLayoutConfig>,
  rowGroups: ZoneRowLayout[],
  nodes: CanvasNode[]
): {
  configs: Record<string, ZoneLayoutConfig>;
  nodes: CanvasNode[];
} {
  const updatedConfigs = { ...zoneConfigs };

  // Build zone -> row startY mapping
  const zoneToRowY = new Map<string, number>();
  rowGroups.forEach((row) => {
    row.zoneIds.forEach((zoneId) => {
      zoneToRowY.set(zoneId, row.startY);
    });
  });

  // Update zone startY values
  Object.keys(updatedConfigs).forEach((zoneId) => {
    const rowStartY = zoneToRowY.get(zoneId);
    if (rowStartY !== undefined) {
      updatedConfigs[zoneId].startY = rowStartY;
    }
  });

  // Update node Y coordinates based on zone Y offsets
  const updatedNodes = nodes.map((node) => {
    const nodeZoneId = Object.entries(updatedConfigs).find(
      ([_, config]) => config.nodeIds.includes(node.id)
    )?.[0];

    if (!nodeZoneId || !node.position) return node;

    const oldConfig = zoneConfigs[nodeZoneId];
    const newConfig = updatedConfigs[nodeZoneId];
    const yOffset = newConfig.startY - oldConfig.startY;

    return {
      ...node,
      position: {
        x: node.position.x,
        y: node.position.y + yOffset,
      },
    };
  });

  return { configs: updatedConfigs, nodes: updatedNodes };
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
 * Main layout calculation function with per-row dynamic heights
 * Orchestrates the multi-pass layout algorithm
 */
export function calculateNodePositions(
  nodeContents: NodeContent[],
  framework: ThinkingFramework | null,
  nodeAffinities: Record<string, Record<string, number>>,
  nodeRefs: Map<string, HTMLDivElement>
): {
  nodes: CanvasNode[];
  zoneBounds: Record<string, { width: number; height: number }>;
  zoneConfigs: Record<string, ZoneLayoutConfig>;
} {
  if (!framework || nodeContents.length === 0) {
    return { nodes: [], zoneBounds: {}, zoneConfigs: {} };
  }

  // Pass 1: Calculate zone configurations and row groupings (temporary Y = 0)
  const { configs: zoneConfigs, rowGroups: initialRowGroups } = calculateZoneConfigs(
    framework,
    nodeContents,
    nodeAffinities
  );

  // Pass 2: Calculate node positions, measure heights, apply per-row uniform heights
  const {
    nodes: tempNodes,
    zoneBounds,
    rowGroups: measuredRowGroups
  } = calculateNodesInZones(
    nodeContents,
    zoneConfigs,
    initialRowGroups,
    nodeRefs,
    framework
  );

  // Pass 3: Apply calculated row Y offsets to zones and nodes
  const { configs: finalZoneConfigs, nodes: zonesNodes } = applyRowYOffsetsToZones(
    zoneConfigs,
    measuredRowGroups,
    tempNodes
  );

  // Pass 4: Calculate positions for unassigned nodes (using updated zone configs)
  const unassignedNodes = calculateUnassignedNodes(
    nodeContents,
    finalZoneConfigs,
    framework,
    zoneBounds,
    nodeRefs
  );

  // Combine all calculated nodes
  const allCalculatedNodes = [...zonesNodes, ...unassignedNodes];

  // Add child nodes (don't need calculated positions, rendered inside parents)
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
    zoneConfigs: finalZoneConfigs,
  };
}
