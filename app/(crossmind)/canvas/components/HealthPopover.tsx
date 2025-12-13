"use client";

import { CheckCircle2, AlertCircle, XCircle, TrendingUp } from "lucide-react";
import { type NodeContent } from "../canvas-data";
import { normalizeHealthScore } from "../lib/canvas-utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

interface HealthPopoverProps {
  node: NodeContent;
  children: React.ReactNode;
}

export function HealthPopover({ node, children }: HealthPopoverProps) {
  if (!node.healthData || !node.healthScore) {
    return <>{children}</>;
  }

  const { healthScore, healthLevel, healthData } = node;
  const { dimensions, suggestions } = (healthData || {}) as { dimensions?: any; suggestions?: string[] };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="right" align="start">
        <div className="space-y-4">
          {/* 总分 */}
          <div>
            <h4 className="text-sm font-semibold mb-1">健康度诊断</h4>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(normalizeHealthScore(healthScore))}`}>
                {normalizeHealthScore(healthScore)}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>

          {/* 维度评分 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {getScoreIcon(dimensions.completeness.score)}
                <span className="text-sm">完整性</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(dimensions.completeness.score)}`}>
                {dimensions.completeness.score}/100
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {getScoreIcon(dimensions.logic.score)}
                <span className="text-sm">逻辑性</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(dimensions.logic.score)}`}>
                {dimensions.logic.score}/100
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {getScoreIcon(dimensions.feasibility.score)}
                <span className="text-sm">可行性</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(dimensions.feasibility.score)}`}>
                {dimensions.feasibility.score}/100
              </span>
            </div>
          </div>

          {/* 问题列表 */}
          {(dimensions.completeness.issues.length > 0 ||
            dimensions.logic.issues.length > 0 ||
            dimensions.feasibility.issues.length > 0) && (
            <div className="space-y-2 pt-2 border-t">
              <h5 className="text-xs font-semibold text-muted-foreground">发现的问题</h5>
              <ul className="text-xs space-y-1">
                {[
                  ...dimensions.completeness.issues,
                  ...dimensions.logic.issues,
                  ...dimensions.feasibility.issues,
                ].map((issue, idx) => (
                  <li key={idx} className="text-muted-foreground flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 建议 */}
          {suggestions && suggestions.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <h5 className="text-xs font-semibold text-muted-foreground">💡 改进建议</h5>
              <ul className="text-xs space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-muted-foreground flex items-start gap-1">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 行动按钮 */}
          <div className="pt-2 border-t space-y-2">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <TrendingUp className="h-3 w-3 mr-1.5" />
              查看详细分析
            </Button>
            {normalizeHealthScore(healthScore) < 70 && (
              <Button size="sm" className="w-full text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                💎 雇佣专家改进
              </Button>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
