"use client";

import { Sparkles, Plus, Loader2 } from "lucide-react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FrameworkSwitcher } from "./FrameworkSwitcher";
import { HealthOverview } from "./HealthOverview";
import type { ThinkingFramework, CanvasNode, AISuggestion } from "../canvas-data";

interface CanvasHeaderProps {
  currentFramework: ThinkingFramework | null;
  onFrameworkChange: (framework: ThinkingFramework) => void;
  nodes: CanvasNode[];
  suggestions: AISuggestion[];
  suggestionsLoading?: boolean;
  onCreateNode: () => void;
  onGenerateSuggestions?: () => void;
}

export function CanvasHeader({
  currentFramework,
  onFrameworkChange,
  nodes,
  suggestions,
  suggestionsLoading,
  onCreateNode,
  onGenerateSuggestions,
}: CanvasHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between gap-2 border-b bg-background px-4 shrink-0">
      <div className="flex items-center gap-2">
        <SidebarToggle />
        <Separator orientation="vertical" className="h-4" />
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Project Canvas</span>
        <Separator orientation="vertical" className="h-4" />
        {/* New Node Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2"
          onClick={onCreateNode}
        >
          <Plus className="h-4 w-4" />
          New Node
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Framework Switcher */}
        <FrameworkSwitcher
          currentFramework={currentFramework}
          onFrameworkChange={onFrameworkChange}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Generate Suggestions Button */}
        {onGenerateSuggestions && currentFramework && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2"
            onClick={onGenerateSuggestions}
            disabled={suggestionsLoading}
          >
            {suggestionsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            重新分析
          </Button>
        )}

        {/* Health Overview (now includes suggestions) */}
        <HealthOverview nodes={nodes} suggestions={suggestions} />
      </div>
    </header>
  );
}
