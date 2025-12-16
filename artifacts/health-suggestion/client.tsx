"use client";

import { Artifact } from "@/components/create-artifact";
import { DocumentSkeleton } from "@/components/document-skeleton";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

type HealthSuggestion = {
  suggestionId: string;
  type: "add-node" | "add-tag" | "refine-content" | "content-suggestion" | "health-issue";
  title: string;
  description: string;
  reason?: string;
  priority: "low" | "medium" | "high" | "critical";
  nodeId?: string;
  actionParams?: any;
  status?: "pending" | "applied" | "dismissed";
};

type HealthSuggestionMetadata = {
  suggestions: HealthSuggestion[];
};

export const healthSuggestionArtifact = new Artifact<
  "health-suggestion",
  HealthSuggestionMetadata
>({
  kind: "health-suggestion",
  description: "Health analysis suggestions with apply/dismiss actions",
  initialize: async ({ setMetadata }) => {
    setMetadata({
      suggestions: [],
    });
  },
  onStreamPart: ({ streamPart, setMetadata }) => {
    if (streamPart.type === "data-health-suggestion") {
      setMetadata((metadata) => {
        const newSuggestion = {
          ...streamPart.data,
          status: "pending" as const,
        };

        // Check if suggestion already exists (avoid duplicates)
        const exists = metadata.suggestions.some(
          (s) => s.suggestionId === newSuggestion.suggestionId
        );

        if (exists) {
          return metadata;
        }

        return {
          suggestions: [...metadata.suggestions, newSuggestion],
        };
      });
    }
  },
  content: ({ metadata, isLoading }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="health-suggestion" />;
    }

    if (!metadata || metadata.suggestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
          <p className="text-sm">暂无健康度建议</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">健康度分析建议</h3>
          <span className="text-xs text-muted-foreground">
            {metadata.suggestions.length} 条建议
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {metadata.suggestions.map((suggestion) => (
            <SuggestionCard key={suggestion.suggestionId} suggestion={suggestion} />
          ))}
        </div>
      </div>
    );
  },
  actions: [],
  toolbar: [],
});

function SuggestionCard({ suggestion }: { suggestion: HealthSuggestion }) {
  const [status, setStatus] = useState(suggestion.status || "pending");
  const [isLoading, setIsLoading] = useState(false);

  const priorityColors = {
    critical: "bg-red-500/10 text-red-700 border-red-200",
    high: "bg-orange-500/10 text-orange-700 border-orange-200",
    medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    low: "bg-blue-500/10 text-blue-700 border-blue-200",
  };

  const priorityLabels = {
    critical: "严重",
    high: "高",
    medium: "中",
    low: "低",
  };

  const typeLabels = {
    "add-node": "添加节点",
    "add-tag": "添加标签",
    "refine-content": "优化内容",
    "content-suggestion": "内容建议",
    "health-issue": "健康度问题",
  };

  const handleApply = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/canvas/suggestion/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.suggestionId }),
      });

      if (!response.ok) {
        throw new Error("应用建议失败");
      }

      setStatus("applied");
      toast.success("建议已应用");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "应用建议失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/canvas/suggestion/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.suggestionId }),
      });

      if (!response.ok) {
        throw new Error("忽略建议失败");
      }

      setStatus("dismissed");
      toast.success("建议已忽略");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "忽略建议失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`
        group relative border rounded-lg p-4 transition-colors
        ${status === "pending" ? "bg-background hover:bg-muted/40" : ""}
        ${status === "applied" ? "bg-green-50 border-green-200" : ""}
        ${status === "dismissed" ? "bg-gray-50 border-gray-200 opacity-60" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Priority badge */}
        <div
          className={`
            shrink-0 px-2 py-0.5 rounded text-xs font-medium border
            ${priorityColors[suggestion.priority]}
          `}
        >
          {priorityLabels[suggestion.priority]}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h4 className="text-sm font-medium">{suggestion.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {typeLabels[suggestion.type]}
              </p>
            </div>

            {/* Status indicator */}
            {status === "applied" && (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            )}
            {status === "dismissed" && (
              <XCircle className="h-4 w-4 text-gray-400 shrink-0" />
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-foreground/80 mb-2">{suggestion.description}</p>

          {/* Reason (if provided) */}
          {suggestion.reason && (
            <p className="text-xs text-muted-foreground italic mb-3">
              原因：{suggestion.reason}
            </p>
          )}

          {/* Actions */}
          {status === "pending" && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={handleApply}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                应用
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                忽略
              </Button>
            </div>
          )}

          {status === "applied" && (
            <p className="text-xs text-green-700">已应用</p>
          )}

          {status === "dismissed" && (
            <p className="text-xs text-gray-500">已忽略</p>
          )}
        </div>
      </div>
    </div>
  );
}
