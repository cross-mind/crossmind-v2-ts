"use client";

import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type StageFilterType = "all" | "ideation" | "research" | "design" | "dev" | "launch";

interface StageFilterProps {
  currentFilter: StageFilterType;
  onFilterChange: (filter: StageFilterType) => void;
}

const STAGE_OPTIONS = [
  { value: "all" as const, label: "All Stages", icon: "" },
  { value: "ideation" as const, label: "Ideation", icon: "💡" },
  { value: "research" as const, label: "Research", icon: "🔍" },
  { value: "design" as const, label: "Design", icon: "📋" },
  { value: "dev" as const, label: "Development", icon: "⚙️" },
  { value: "launch" as const, label: "Launch", icon: "🚀" },
];

export function StageFilter({ currentFilter, onFilterChange }: StageFilterProps) {
  const currentOption = STAGE_OPTIONS.find((opt) => opt.value === currentFilter);
  const displayLabel = currentOption
    ? currentOption.icon
      ? `${currentOption.icon} ${currentOption.label}`
      : currentOption.label
    : "All Stages";

  return (
    <div className="absolute top-4 left-4 bg-background/90 backdrop-blur border border-border rounded-lg shadow-lg">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 px-3">
            <Tag className="h-3.5 w-3.5 mr-1.5" />
            {displayLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="p-1 space-y-0.5">
            {STAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={currentFilter === option.value ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => onFilterChange(option.value)}
              >
                {option.icon && `${option.icon} `}
                {option.label}
              </Button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export type { StageFilterType };
