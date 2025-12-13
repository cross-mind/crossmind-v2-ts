"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NodeSuggestionBadgeProps {
  count: number;
  className?: string;
}

/**
 * Badge showing number of suggestions for a node
 * Displays with sparkles icon and count
 */
export function NodeSuggestionBadge({
  count,
  className,
}: NodeSuggestionBadgeProps) {
  if (count === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-md",
        "bg-gradient-to-r from-purple-500/10 to-pink-500/10",
        "border border-purple-200/50",
        "text-purple-700 dark:text-purple-300",
        "transition-all duration-200",
        "hover:from-purple-500/20 hover:to-pink-500/20",
        "cursor-pointer",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      <span className="text-xs font-medium">{count}</span>
    </div>
  );
}
