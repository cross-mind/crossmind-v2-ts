"use client";

import { useMemo } from "react";
import { Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CanvasNode } from "../canvas-data";

interface TagFilterProps {
  nodes: CanvasNode[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ nodes, selectedTags, onTagsChange }: TagFilterProps) {
  // Extract all unique tags from nodes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node) => {
      node.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  // Group tags by namespace (e.g., "stage/ideation" -> namespace: "stage", value: "ideation")
  const tagsByNamespace = useMemo(() => {
    const groups: Record<string, string[]> = {};
    allTags.forEach((tag) => {
      const slashIndex = tag.indexOf("/");
      if (slashIndex === -1) {
        // Tags without namespace go to "other"
        if (!groups.other) groups.other = [];
        groups.other.push(tag);
      } else {
        const namespace = tag.substring(0, slashIndex);
        const value = tag.substring(slashIndex + 1);
        if (!groups[namespace]) groups[namespace] = [];
        groups[namespace].push(value);
      }
    });
    return groups;
  }, [allTags]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 px-3">
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Tags{selectedTags.length > 0 && ` (${selectedTags.length})`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="p-2">
          <div className="text-xs font-medium mb-2">Filter by Tags</div>

          {/* Clear all button */}
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mb-2 h-7 text-xs"
              onClick={() => onTagsChange([])}
            >
              Clear All
            </Button>
          )}

          {/* Tag groups by namespace */}
          {allTags.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center">
              No tags available
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-3">
                {Object.entries(tagsByNamespace).map(([namespace, values]) => (
                  <div key={namespace}>
                    <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1 px-2">
                      {namespace}
                    </div>
                    <div className="space-y-0.5">
                      {values.map((value) => {
                        const fullTag = namespace === "other" ? value : `${namespace}/${value}`;
                        const isSelected = selectedTags.includes(fullTag);
                        return (
                          <label
                            key={fullTag}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTag(fullTag)}
                              className="h-3 w-3 rounded border-border cursor-pointer"
                            />
                            <span className="text-xs flex-1">{value}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
