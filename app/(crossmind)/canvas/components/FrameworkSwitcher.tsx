"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { FRAMEWORKS, ZONE_COLORS, type ThinkingFramework } from "../canvas-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface FrameworkSwitcherProps {
  currentFramework: ThinkingFramework;
  onFrameworkChange: (framework: ThinkingFramework) => void;
}

export function FrameworkSwitcher({
  currentFramework,
  onFrameworkChange,
}: FrameworkSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 px-4 h-10 border-border/40 hover:bg-accent/50"
        >
          <span className="text-lg">{currentFramework.icon}</span>
          <span className="font-medium">{currentFramework.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          切换思维框架
        </div>
        {FRAMEWORKS.map((framework) => (
          <DropdownMenuItem
            key={framework.id}
            onClick={() => {
              if (framework.id !== currentFramework.id) {
                onFrameworkChange(framework);
              }
              setIsOpen(false);
            }}
            className="flex items-start gap-3 py-3 cursor-pointer"
          >
            <span className="text-xl mt-0.5">{framework.icon}</span>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{framework.name}</span>
                {framework.id === currentFramework.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {framework.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {framework.zones.map((zone, idx) => (
                  <span
                    key={zone.id}
                    className="text-[10px] px-1.5 py-0.5 rounded text-white font-medium"
                    style={{
                      backgroundColor: ZONE_COLORS[zone.colorKey].label,
                      opacity: 0.9,
                    }}
                  >
                    {zone.name}
                  </span>
                ))}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
