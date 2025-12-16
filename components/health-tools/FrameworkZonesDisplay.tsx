"use client";

import { Folder, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Zone = {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    title: string;
  }>;
};

type FrameworkZonesOutput = {
  framework: {
    id: string;
    name: string;
    description: string;
  };
  zones: Zone[];
};

export function FrameworkZonesDisplay({ output }: { output: FrameworkZonesOutput }) {
  const totalNodes = output.zones.reduce((sum, zone) => sum + zone.nodes.length, 0);
  const emptyZones = output.zones.filter((z) => z.nodes.length === 0);

  return (
    <div className="space-y-3">
      {/* Framework Info */}
      <div className="rounded-md border bg-muted/30 p-3">
        <h4 className="font-medium text-sm">{output.framework.name}</h4>
        <p className="text-muted-foreground text-xs mt-1">{output.framework.description}</p>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {output.zones.length} 个区域
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {totalNodes} 个节点
          </Badge>
          {emptyZones.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {emptyZones.length} 个空白区域
            </Badge>
          )}
        </div>
      </div>

      {/* Zones List */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="divide-y divide-border/50">
          {output.zones.map((zone) => (
            <div key={zone.id} className="p-3 hover:bg-muted/40 transition-colors">
              <div className="flex items-start gap-2">
                <Folder className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{zone.name}</span>
                    <Badge variant={zone.nodes.length === 0 ? "outline" : "secondary"} className="text-xs shrink-0">
                      {zone.nodes.length}
                    </Badge>
                  </div>
                  {zone.description && (
                    <p className="text-muted-foreground text-xs mt-1">{zone.description}</p>
                  )}

                  {/* Nodes in this zone */}
                  {zone.nodes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {zone.nodes.map((node) => (
                        <div key={node.id} className="flex items-center gap-1.5 text-xs">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{node.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
