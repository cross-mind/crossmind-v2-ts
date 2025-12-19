"use client";

import { Sparkles } from "lucide-react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FrameworkSwitcher } from "./FrameworkSwitcher";
import { HealthOverview } from "./HealthOverview";
import type { ThinkingFramework, CanvasNode } from "../canvas-data";
import type { CanvasSuggestion, ProjectFrameworkHealthDimension } from "@/lib/db/schema";

interface CanvasHeaderProps {
  currentFramework: ThinkingFramework | null;
  projectFramework: { id: string; name: string; healthScore?: number | null } | null;
  onFrameworkChange: (framework: ThinkingFramework) => void;
  nodes: CanvasNode[];
  suggestions: CanvasSuggestion[];
  dimensions: ProjectFrameworkHealthDimension[];
  suggestionsLoading?: boolean;
  isGenerating?: boolean;
  elapsedTime?: number;
  onGenerateSuggestions?: () => void;
  onApplySuggestion?: (suggestionId: string) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
}

export function CanvasHeader({
  currentFramework,
  projectFramework,
  onFrameworkChange,
  nodes,
  suggestions,
  dimensions,
  suggestionsLoading,
  isGenerating = false,
  elapsedTime = 0,
  onGenerateSuggestions,
  onApplySuggestion,
  onDismissSuggestion,
}: CanvasHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarToggle />
        <Separator orientation="vertical" className="h-4" />
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Project Canvas</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Framework Switcher */}
        <FrameworkSwitcher
          currentFramework={currentFramework}
          onFrameworkChange={onFrameworkChange}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Health Overview (now includes re-analyze button) */}
        <HealthOverview
          nodes={nodes}
          suggestions={suggestions}
          currentFramework={projectFramework}
          dimensions={dimensions}
          onGenerateSuggestions={onGenerateSuggestions}
          isGenerating={isGenerating}
          elapsedTime={elapsedTime}
          onApplySuggestion={onApplySuggestion}
          onDismissSuggestion={onDismissSuggestion}
        />
      </div>
    </header>
  );
}
