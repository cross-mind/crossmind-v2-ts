/**
 * Drop Indicator Component
 * 显示拖放插入位置的指示线
 */
"use client";

import { cn } from "@/lib/utils";

export function DropIndicator({
  position,
  isActive,
}: {
  position: "top" | "bottom";
  isActive: boolean;
}) {
  if (!isActive) return null;

  // Position indicator halfway between cards for better visual centering
  return (
    <div
      className={cn(
        "absolute left-0 right-0 h-0.5 bg-primary z-20",
        position === "top" ? "-top-3" : "-bottom-3"
      )}
    >
      {/* 左侧圆点 */}
      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary" />
      {/* 右侧圆点 */}
      <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
    </div>
  );
}
