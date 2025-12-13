"use client";

import { useMemo } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CanvasNode } from "../canvas-data";

const NODE_TYPE_LABELS: Record<string, string> = {
  document: "Document",
  idea: "Idea",
  task: "Task",
  inspiration: "Inspiration",
};

interface HiddenNodesDropdownProps {
  nodes: CanvasNode[];
  currentFrameworkId: string | null;
  onRestoreNode: (nodeId: string) => void;
}

export function HiddenNodesDropdown({
  nodes,
  currentFrameworkId,
  onRestoreNode,
}: HiddenNodesDropdownProps) {
  // Filter nodes that are hidden in the current framework
  const hiddenNodes = useMemo(() => {
    if (!currentFrameworkId) return [];

    return nodes.filter((node) => {
      const hiddenInFrameworks = (node as any).hiddenInFrameworks;
      return hiddenInFrameworks?.[currentFrameworkId] === true;
    });
  }, [nodes, currentFrameworkId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3"
          disabled={hiddenNodes.length === 0}
        >
          <EyeOff className="h-3.5 w-3.5 mr-1.5" />
          Hidden ({hiddenNodes.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {hiddenNodes.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground text-center">
            No hidden nodes
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="p-1 space-y-0.5">
              {hiddenNodes.map((node) => (
                <Button
                  key={node.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-auto py-2 px-2"
                  onClick={() => onRestoreNode(node.id)}
                >
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-xs font-medium truncate">{node.title}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {NODE_TYPE_LABELS[node.type] || node.type}
                    </div>
                  </div>
                  <Eye className="h-3 w-3 ml-2 shrink-0" />
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
