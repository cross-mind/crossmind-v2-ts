"use client";

import type { ThinkingFramework } from "../canvas-data";
import { ZONE_COLORS } from "../canvas-data";
import { DroppableZone } from "./DroppableZone";

interface StrategicZonesProps {
  showStrategicZones: boolean;
  canvasOffset: { x: number; y: number };
  scale: number;
  layoutCalculated: boolean;
  currentFramework: ThinkingFramework | null;
  zoneBounds: Record<string, { width: number; height: number }>;
  getDynamicZoneConfigs: () => Record<string, { startX: number; startY: number; columnCount: number; nodeIds: string[] }>;
  overNodeId: string | null;
}

export function StrategicZones({
  showStrategicZones,
  canvasOffset,
  scale,
  layoutCalculated,
  currentFramework,
  zoneBounds,
  getDynamicZoneConfigs,
  overNodeId,
}: StrategicZonesProps) {
  if (!showStrategicZones || !currentFramework) {
    return null;
  }

  return (
    <div
      className="absolute"
      style={{
        left: 0,
        top: 0,
        width: "4000px",
        height: "3000px",
        pointerEvents: 'none', // Disable by default, children will enable as needed
      }}
    >
      {/* Render zones based on current framework */}
      {layoutCalculated && (() => {
        // Get zone configurations for current framework
        const zoneConfigs = getDynamicZoneConfigs();

        return currentFramework.zones.map((zone) => {
          // Get zone configuration with grid position
          const config = zoneConfigs[zone.id];
          const zoneBound = zoneBounds[zone.id];

          // Skip if no config available
          if (!config) {
            return null;
          }

          // Check if this zone is being hovered over
          const isOver = overNodeId === `zone-${zone.id}`;

          return (
            <DroppableZone
              key={zone.id}
              zone={zone}
              config={config}
              zoneBound={zoneBound}
              isOver={isOver}
            />
          );
        });
      })()}
    </div>
  );
}
