"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, MessageSquare, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeDetailOutput = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  healthScore: number | null;
  healthLevel: "critical" | "warning" | "good" | "excellent" | null;
  healthData: any;
  activities: Array<{
    type: string;
    description: string;
    createdAt: Date | string;
  }>;
  comments: Array<{
    content: string;
    authorId: string;
    createdAt: Date | string;
  }>;
};

const healthLevelColors = {
  critical: "text-red-600 bg-red-50 border-red-200",
  warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
  good: "text-blue-600 bg-blue-50 border-blue-200",
  excellent: "text-green-600 bg-green-50 border-green-200",
};

export function NodeDetailDisplay({ output }: { output: NodeDetailOutput }) {
  return (
    <div className="space-y-3">
      {/* Node Header */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{output.title}</h4>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {output.type}
              </Badge>
              {output.healthLevel && output.healthScore !== null && (
                <Badge
                  className={cn(
                    "text-xs border",
                    healthLevelColors[output.healthLevel]
                  )}
                >
                  健康度: {output.healthScore}/100
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-md border bg-muted/10 p-3">
        <h5 className="font-medium text-muted-foreground text-xs uppercase tracking-wide mb-2">
          内容
        </h5>
        <ScrollArea className="max-h-[150px]">
          <p className="text-sm whitespace-pre-wrap">{output.content}</p>
        </ScrollArea>
      </div>

      {/* Tags */}
      {output.tags && output.tags.length > 0 && (
        <div className="rounded-md border bg-muted/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <h5 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              标签
            </h5>
          </div>
          <div className="flex flex-wrap gap-1">
            {output.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {output.activities && output.activities.length > 0 && (
        <div className="rounded-md border bg-muted/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <h5 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              活动历史
            </h5>
          </div>
          <ScrollArea className="max-h-[120px]">
            <div className="space-y-2">
              {output.activities.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="text-xs">
                  <span className="text-muted-foreground">{activity.description}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Comments */}
      {output.comments && output.comments.length > 0 && (
        <div className="rounded-md border bg-muted/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <h5 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              评论 ({output.comments.length})
            </h5>
          </div>
          <ScrollArea className="max-h-[120px]">
            <div className="space-y-2">
              {output.comments.map((comment, idx) => (
                <div key={idx} className="text-xs">
                  <p className="text-muted-foreground">{comment.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
