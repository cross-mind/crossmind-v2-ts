"use client";

import type { ThinkingFramework } from "../canvas-data";
import { ZONE_COLORS } from "../canvas-data";

interface StrategicZonesProps {
  showStrategicZones: boolean;
  canvasOffset: { x: number; y: number };
  scale: number;
  layoutCalculated: boolean;
  currentFramework: ThinkingFramework;
  zoneBounds: Record<string, { width: number; height: number }>;
  getDynamicZoneConfigs: () => Record<string, { startX: number; startY: number; columnCount: number; nodeIds: string[] }>;
}

export function StrategicZones({
  showStrategicZones,
  canvasOffset,
  scale,
  layoutCalculated,
  currentFramework,
  zoneBounds,
  getDynamicZoneConfigs,
}: StrategicZonesProps) {
  if (!showStrategicZones) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: "4000px",
        height: "3000px",
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

          // Get colors from the palette using colorKey
          const colors = ZONE_COLORS[zone.colorKey];

          return (
            <div
              key={zone.id}
              className="absolute border-2 border-dashed rounded-2xl transition-all duration-500"
              style={{
                left: config.startX - 20,
                top: config.startY - 20,
                width: zoneBound?.width || 800,
                height: zoneBound?.height || 800,
                borderColor: `${colors.base}4D`, // 30% opacity for border
                backgroundColor: `${colors.base}1A`, // 10% opacity for background
              }}
            >
              <div
                className="absolute top-3 left-4 text-sm font-bold px-3 py-1.5 rounded-lg inline-block text-white shadow-md"
                style={{
                  backgroundColor: colors.label,
                }}
              >
                {zone.name}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}
