"use client";

import { Sparkles } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SuggestionCard } from "./SuggestionCard";
import type { CanvasSuggestion } from "@/lib/db/schema";

interface SuggestionPopoverProps {
  suggestions: CanvasSuggestion[];
  children: React.ReactNode;
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
}

/**
 * Popover component for displaying node suggestions
 * Similar to HealthPopover pattern - lightweight and compact
 *
 * Usage:
 * <SuggestionPopover
 *   suggestions={nodeSuggestions}
 *   onApply={handleApply}
 *   onDismiss={handleDismiss}
 * >
 *   <NodeSuggestionBadge count={nodeSuggestions.length} />
 * </SuggestionPopover>
 */
export function SuggestionPopover({
  suggestions,
  children,
  onApply,
  onDismiss,
}: SuggestionPopoverProps) {
  if (suggestions.length === 0) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-[400px] p-0 overflow-hidden"
        side="right"
        align="start"
      >
        <div className="flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-purple-50 to-pink-50 shrink-0">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h4 className="text-sm font-semibold">改进建议</h4>
            <span className="text-xs text-muted-foreground">
              ({suggestions.length})
            </span>
          </div>

          {/* Suggestion List - ScrollArea with fixed height */}
          <ScrollArea
            className="h-[440px]"
            onWheelCapture={(e) => {
              // Stop propagation to prevent canvas scrolling
              e.stopPropagation();
            }}
          >
            <div className="p-3 space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  compact={true}
                  onApply={() => onApply(suggestion.id)}
                  onDismiss={() => onDismiss(suggestion.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
