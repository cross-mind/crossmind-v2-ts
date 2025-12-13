"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ThinkingFramework } from "../canvas-data";
import { ZONE_COLORS } from "../canvas-data";

interface DroppableZoneProps {
  zone: ThinkingFramework['zones'][0];
  config: { startX: number; startY: number; columnCount: number; nodeIds: string[] };
  zoneBound: { width: number; height: number } | undefined;
  isOver: boolean;
}

export function DroppableZone({ zone, config, zoneBound, isOver }: DroppableZoneProps) {
  const { setNodeRef, isOver: isOverFromHook } = useDroppable({
    id: `zone-${zone.id}`,
    data: {
      type: 'zone',
      zoneId: zone.id,
    },
  });

  // 调试：记录 zone 是否被 hover
  if (isOverFromHook) {
    console.log('[DroppableZone] Zone is being hovered:', zone.id);
  }

  const colors = ZONE_COLORS[zone.colorKey];

  return (
    <div
      ref={setNodeRef}
      className="absolute border-2 border-dashed rounded-2xl transition-all duration-300"
      style={{
        left: config.startX - 20,
        top: config.startY - 20,
        width: zoneBound?.width || 800,
        height: zoneBound?.height || 800,
        borderColor: isOver ? colors.label : `${colors.base}4D`,
        backgroundColor: isOver ? `${colors.base}33` : `${colors.base}1A`,
        pointerEvents: 'auto', // Must be 'auto' for @dnd-kit collision detection
      }}
    >
      <div
        className="absolute top-3 left-4 text-sm font-bold px-3 py-1.5 rounded-lg inline-block text-white shadow-md pointer-events-none"
        style={{
          backgroundColor: colors.label,
        }}
      >
        {zone.name}
      </div>
    </div>
  );
}
