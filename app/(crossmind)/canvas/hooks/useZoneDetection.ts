/**
 * useZoneDetection Hook
 * Detects which zone contains a given point (x, y) in Canvas coordinates
 */

import { useCallback } from "react";
import type { ThinkingFramework } from "../canvas-data";

// Canvas layout constants (must match LayoutEngine.ts)
const ZONE_WIDTH = 800;
const ZONE_GAP = 20;

export interface ZoneInfo {
  id: string;
  zoneKey: string;
  name: string;
}

interface ZoneConfig {
  startX: number;
  startY: number;
  columnCount: number;
  nodeIds: string[];
}

/**
 * Hook to detect which zone contains a point
 * @param framework - Current thinking framework
 * @param zoneBounds - Zone boundary information (width, height)
 * @param getDynamicZoneConfigs - Function to get zone configurations
 * @returns Function to detect zone at (x, y) coordinates
 */
export function useZoneDetection(
  framework: ThinkingFramework | null,
  zoneBounds: Record<string, { width: number; height: number }>,
  getDynamicZoneConfigs: () => Record<string, ZoneConfig>
) {
  return useCallback(
    (x: number, y: number): ZoneInfo | null => {
      if (!framework) return null;

      const zoneConfigs = getDynamicZoneConfigs();
      const zoneCount = framework.zones.length;

      // Calculate grid layout (same logic as page.tsx lines 207-213)
      let zonesPerRow = zoneCount;
      if (zoneCount > 5) {
        zonesPerRow = zoneCount <= 8 ? 4 : 3; // 6-8 zones: 4 per row, 9+ zones: 3 per row
      }

      console.log('[Zone Detection] Checking point', { x, y, zoneCount, zonesPerRow });

      // Check each zone
      for (const [index, zone] of framework.zones.entries()) {
        const config = zoneConfigs[zone.id];
        if (!config) continue;

        const zoneBound = zoneBounds[zone.id] || { width: ZONE_WIDTH, height: 1000 };

        const isInZone =
          x >= config.startX &&
          x <= config.startX + ZONE_WIDTH &&
          y >= config.startY &&
          y <= config.startY + zoneBound.height;

        console.log(`[Zone Detection] Zone ${index}: ${zone.name}`, {
          bounds: {
            xRange: [config.startX, config.startX + ZONE_WIDTH],
            yRange: [config.startY, config.startY + zoneBound.height]
          },
          isInZone
        });

        // Check if point is within zone bounds
        if (isInZone) {
          console.log('[Zone Detection] Match found:', zone.name);
          return {
            id: zone.id,
            zoneKey: zone.zoneKey,
            name: zone.name,
          };
        }
      }

      console.log('[Zone Detection] No zone matched (unassigned)');
      return null; // Point is outside all zones (unassigned area)
    },
    [framework, zoneBounds, getDynamicZoneConfigs]
  );
}
