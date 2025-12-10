"use client";

import { Activity, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { MOCK_USER, type NodeContent, type AISuggestion } from "../canvas-data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HealthOverviewProps {
  nodes: NodeContent[];
  suggestions: AISuggestion[];
}

export function HealthOverview({ nodes, suggestions }: HealthOverviewProps) {
  // 计算整体健康度统计
  const nodesWithHealth = nodes.filter((n) => n.healthScore !== undefined);
  const criticalNodes = nodesWithHealth.filter((n) => n.healthLevel === "critical");
  const warningNodes = nodesWithHealth.filter((n) => n.healthLevel === "warning");
  const goodNodes = nodesWithHealth.filter((n) => n.healthLevel === "good");
  const excellentNodes = nodesWithHealth.filter((n) => n.healthLevel === "excellent");

  // 计算平均分
  const avgScore = nodesWithHealth.length > 0
    ? Math.round(
        nodesWithHealth.reduce((sum, n) => sum + (n.healthScore || 0), 0) /
          nodesWithHealth.length
      )
    : 0;

  const healthLevelColor = avgScore >= 85 ? "text-green-600" : avgScore >= 70 ? "text-blue-600" : avgScore >= 50 ? "text-yellow-600" : "text-red-600";
  const healthLevelBg = avgScore >= 85 ? "bg-green-50" : avgScore >= 70 ? "bg-blue-50" : avgScore >= 50 ? "bg-yellow-50" : "bg-red-50";

  // 收集所有改进建议（合并节点的健康度建议和 AI Suggestions）
  const allSuggestions: Array<{
    id: string;
    title: string;
    description: string;
    type: "add-node" | "add-tag" | "refine-content" | "health-issue";
    nodeId?: string;
  }> = [];

  // 添加节点健康度建议
  nodesWithHealth.forEach((node) => {
    if (node.healthData?.suggestions) {
      node.healthData.suggestions.forEach((suggestion, index) => {
        allSuggestions.push({
          id: `${node.id}-suggestion-${index}`,
          title: node.title,
          description: suggestion,
          type: "health-issue",
          nodeId: node.id,
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
    });
  });

  // 免费用户看到的是灰色+锁定状态
  const isFree = MOCK_USER.subscriptionTier === "free";

  if (isFree) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 px-4 h-10 border-border/40 bg-muted/30 cursor-not-allowed">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">整体健康度</span>
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
          <span className="text-sm font-medium">整体健康度</span>
          <span className={`text-sm font-bold ${healthLevelColor}`}>
            {avgScore}/100
          </span>
          <span className="text-xs opacity-60">|</span>
          <div className="flex items-center gap-1">
            <span className="text-xs">🔴 {criticalNodes.length}</span>
            <span className="text-xs">🟡 {warningNodes.length}</span>
            <span className="text-xs">🟢 {goodNodes.length + excellentNodes.length}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">项目整体健康度报告</h4>
            <p className="text-2xl font-bold {healthLevelColor}">{avgScore}/100</p>
          </div>

          {criticalNodes.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-red-600 flex items-center gap-1">
                🔴 严重问题 ({criticalNodes.length})
              </h5>
              <ul className="text-sm space-y-1">
                {criticalNodes.map((node) => (
                  <li key={node.id} className="text-muted-foreground">
                    • {node.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 需要改进的节点和建议 */}
          {(warningNodes.length > 0 || allSuggestions.length > 0) && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-yellow-600 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                需要改进 ({warningNodes.length + criticalNodes.length})
              </h5>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {allSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium">
                          {suggestion.type === "health-issue" ? `${suggestion.title}` : suggestion.title}
                        </p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {suggestion.type === "add-node" && "新增"}
                          {suggestion.type === "add-tag" && "标签"}
                          {suggestion.type === "refine-content" && "优化"}
                          {suggestion.type === "health-issue" && "健康度"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="pt-3 border-t">
            <Button variant="outline" className="w-full text-sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              生成完整诊断报告
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
