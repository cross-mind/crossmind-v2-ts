"use client";

import { Check, X, MessageSquare, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionPreview } from "./ActionPreview";
import type { CanvasSuggestion } from "@/lib/db/schema";

interface SuggestionCardProps {
  suggestion: CanvasSuggestion;
  compact?: boolean;
  onApply: () => void;
  onDismiss: () => void;
}

/**
 * Card component for displaying a single suggestion
 * Supports both compact (Popover) and full (Panel) modes
 */
export function SuggestionCard({
  suggestion,
  compact = false,
  onApply,
  onDismiss,
}: SuggestionCardProps) {
  const priorityColors = {
    low: "text-gray-600",
    medium: "text-blue-600",
    high: "text-orange-600",
    critical: "text-red-600",
  };

  const priorityBgColors = {
    low: "bg-gray-100",
    medium: "bg-blue-100",
    high: "bg-orange-100",
    critical: "bg-red-100",
  };

  const priorityLabels = {
    low: "低",
    medium: "中",
    high: "高",
    critical: "紧急",
  };

  if (compact) {
    // Compact layout for Popover
    return (
      <div className="space-y-2 p-3 border rounded-lg hover:bg-muted/40 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${priorityBgColors[suggestion.priority as keyof typeof priorityBgColors]} ${priorityColors[suggestion.priority as keyof typeof priorityColors]}`}
            >
              {priorityLabels[suggestion.priority as keyof typeof priorityLabels]}
            </span>
          </div>
          {suggestion.impactScore && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">
                +{suggestion.impactScore}
              </span>
            </div>
          )}
        </div>

        <h5 className="text-sm font-medium">{suggestion.title}</h5>

        <p className="text-xs text-muted-foreground">
          {suggestion.description}
        </p>

        {suggestion.reason && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{suggestion.reason}</span>
          </div>
        )}

        <ActionPreview suggestion={suggestion} compact />

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={onApply}
            className="flex-1 h-7 text-xs"
          >
            {suggestion.type === "content-suggestion" ? (
              <>
                <MessageSquare className="h-3 w-3 mr-1" />
                与 AI 讨论
              </>
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                应用
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            忽略
          </Button>
        </div>
      </div>
    );
  }

  // Full layout for standalone panel (future enhancement)
  return (
    <div className="space-y-3 p-4 border rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${priorityBgColors[suggestion.priority as keyof typeof priorityBgColors]} ${priorityColors[suggestion.priority as keyof typeof priorityColors]}`}
            >
              {priorityLabels[suggestion.priority as keyof typeof priorityLabels]}
            </span>
            {suggestion.impactScore && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  +{suggestion.impactScore}
                </span>
              </div>
            )}
          </div>

          <h4 className="text-base font-semibold">{suggestion.title}</h4>

          <p className="text-sm text-muted-foreground">
            {suggestion.description}
          </p>

          {suggestion.reason && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{suggestion.reason}</span>
            </div>
          )}
        </div>
      </div>

      <ActionPreview suggestion={suggestion} />

      <div className="flex gap-3 pt-2">
        <Button onClick={onApply} size="sm" className="flex-1">
          {suggestion.type === "content-suggestion" ? (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              与 AI 讨论
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              应用建议
            </>
          )}
        </Button>
        <Button onClick={onDismiss} variant="ghost" size="sm">
          <X className="h-4 w-4 mr-2" />
          忽略
        </Button>
      </div>
    </div>
  );
}
