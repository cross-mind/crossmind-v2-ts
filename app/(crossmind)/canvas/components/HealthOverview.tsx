"use client";

import { Activity, TrendingUp, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import { MOCK_USER, type NodeContent } from "../canvas-data";
import { normalizeHealthScore } from "../lib/canvas-utils";
import type { CanvasSuggestion } from "@/lib/db/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SuggestionCard } from "./SuggestionCard";

interface HealthOverviewProps {
  nodes: NodeContent[];
  suggestions: CanvasSuggestion[];
  currentFramework: { id: string; name: string; healthScore?: number | null } | null;
  onGenerateSuggestions?: () => void;
  isGenerating?: boolean;
  elapsedTime?: number;
  onApplySuggestion?: (suggestionId: string) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
}

export function HealthOverview({
  nodes,
  suggestions,
  currentFramework,
  onGenerateSuggestions,
  isGenerating,
  elapsedTime,
  onApplySuggestion,
  onDismissSuggestion,
}: HealthOverviewProps) {
  // 使用 framework 级别的健康度分数（而不是计算所有节点的平均值）
  const frameworkHealthScore = currentFramework?.healthScore != null
    ? Math.round(currentFramework.healthScore)
    : null;

  // 为了显示节点级别的统计，仍然计算节点健康度（但仅用于详细信息）
  const nodesWithHealth = nodes.filter((n) => n.healthScore != null);
  const criticalNodes = nodesWithHealth.filter((n) => n.healthLevel === "critical");
  const warningNodes = nodesWithHealth.filter((n) => n.healthLevel === "warning");
  const goodNodes = nodesWithHealth.filter((n) => n.healthLevel === "good");
  const excellentNodes = nodesWithHealth.filter((n) => n.healthLevel === "excellent");

  // 使用 framework 健康度分数作为总分，如果没有则回退到节点平均值
  const avgScore = frameworkHealthScore ?? (nodesWithHealth.length > 0
    ? Math.round(
        nodesWithHealth.reduce((sum, n) => sum + normalizeHealthScore(n.healthScore), 0) /
          nodesWithHealth.length
      )
    : 0);

  const healthLevelColor = avgScore >= 85 ? "text-green-600" : avgScore >= 70 ? "text-blue-600" : avgScore >= 50 ? "text-yellow-600" : "text-red-600";
  const healthLevelBg = avgScore >= 85 ? "bg-green-50" : avgScore >= 70 ? "bg-blue-50" : avgScore >= 50 ? "bg-yellow-50" : "bg-red-50";

  // 创建 nodeId 到 nodeTitle 的映射
  const nodeIdToTitle = new Map(nodes.map(n => [n.id, n.title]));

  // 收集所有改进建议（合并节点的健康度建议和 AI Suggestions）
  const allSuggestions: Array<{
    id: string;
    title: string;
    description: string;
    type: "add-node" | "add-tag" | "refine-content" | "content-suggestion" | "health-issue";
    priority: "critical" | "high" | "medium" | "low";
    nodeId?: string;
    nodeTitle?: string;
  }> = [];

  // 添加节点健康度建议（根据节点健康度级别映射优先级）
  nodesWithHealth.forEach((node) => {
    const healthData = node.healthData as { dimensions: any; suggestions: string[] } | undefined;
    if (healthData?.suggestions) {
      // 根据节点健康度级别确定建议优先级
      const priority = node.healthLevel === "critical" ? "critical"
        : node.healthLevel === "warning" ? "high"
        : "medium";

      healthData.suggestions.forEach((suggestion, index) => {
        allSuggestions.push({
          id: `${node.id}-suggestion-${index}`,
          title: `优化「${node.title}」`,
          description: suggestion,
          type: "health-issue",
          priority,
          nodeId: node.id,
          nodeTitle: node.title,
        });
      });
    }
  });

  // 添加通用 AI Suggestions
  suggestions.forEach((suggestion) => {
    allSuggestions.push({
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      type: suggestion.type,
      priority: suggestion.priority || "medium",
      nodeId: suggestion.nodeId || undefined,
      nodeTitle: suggestion.nodeId ? nodeIdToTitle.get(suggestion.nodeId) : undefined,
    });
  });

  // 按优先级排序
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // 免费用户看到的是灰色+锁定状态
  const isFree = MOCK_USER.subscriptionTier === "free";

  if (isFree) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 px-4 h-10 border-border/40 bg-muted/30 cursor-not-allowed">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">健康度分析</span>
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              付费解锁
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h4 className="font-semibold">AI 健康度诊断</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              升级到基础版或专业版,解锁 AI 诊断功能,实时发现项目薄弱环节
            </p>
            <div className="pt-2 border-t">
              <Button className="w-full">
                <TrendingUp className="h-4 w-4 mr-2" />
                升级解锁
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`gap-2 px-4 h-10 border-border/40 ${healthLevelBg} hover:opacity-80`}>
          <Activity className={`h-4 w-4 ${healthLevelColor}`} />
          <span className="text-sm font-medium">健康度分析</span>
          {(frameworkHealthScore !== null || nodesWithHealth.length > 0) && (
            <span className={`text-sm font-bold ${healthLevelColor}`}>
              {avgScore}/100
            </span>
          )}
          {allSuggestions.length > 0 && (
            <>
              <span className="text-xs opacity-60">|</span>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-600">{allSuggestions.length} 条建议</span>
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px]">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">{allSuggestions.length} 条改进建议</h4>
            {(frameworkHealthScore !== null || nodesWithHealth.length > 0) && (
              <p className="text-xs text-muted-foreground">
                健康度：{avgScore}/100
                {nodesWithHealth.length > 0 && ` · ${nodesWithHealth.length} 个节点已评分`}
              </p>
            )}
          </div>

          {/* AI 改进建议 - Linear Style */}
          {allSuggestions.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <ScrollArea
                className="h-[400px]"
                onWheelCapture={(e) => {
                  // Stop propagation to prevent canvas scrolling
                  e.stopPropagation();
                }}
              >
                <div className="divide-y divide-border/50">
                  {allSuggestions.map((suggestion) => {
                    // 将 suggestion 转换为 CanvasSuggestion 类型
                    const canvasSuggestion = suggestions.find(s => s.id === suggestion.id);

                    // 根据优先级确定圆点颜色类名（红黄蓝灰）
                    let dotClassName = "h-2 w-2 rounded-full shrink-0";
                    if (suggestion.priority === "critical") {
                      dotClassName += " bg-red-500";
                    } else if (suggestion.priority === "high") {
                      dotClassName += " bg-yellow-500";
                    } else if (suggestion.priority === "medium") {
                      dotClassName += " bg-blue-500";
                    } else {
                      dotClassName += " bg-gray-400";
                    }

                    if (!canvasSuggestion) {
                      // 如果是 health-issue 类型，跳过 hover 卡片
                      return (
                        <div
                          key={suggestion.id}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-default"
                        >
                          <div className={dotClassName} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{suggestion.title}</p>
                          </div>
                          {suggestion.nodeTitle && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {suggestion.nodeTitle}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <HoverCard key={suggestion.id} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer">
                            <div className={dotClassName} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{suggestion.title}</p>
                            </div>
                            {suggestion.nodeTitle && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {suggestion.nodeTitle}
                              </span>
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent
                          className="w-[400px] p-0"
                          side="right"
                          align="start"
                        >
                          <SuggestionCard
                            suggestion={canvasSuggestion}
                            compact={true}
                            onApply={() => onApplySuggestion?.(suggestion.id)}
                            onDismiss={() => onDismissSuggestion?.(suggestion.id)}
                          />
                        </HoverCardContent>
                      </HoverCard>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {onGenerateSuggestions && (
            <div className="pt-3 border-t">
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={onGenerateSuggestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    分析中... {elapsedTime}s
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    重新分析
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
