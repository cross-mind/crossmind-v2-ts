"use client";

import { Lock } from "lucide-react";
import { MOCK_USER, type NodeContent } from "../canvas-data";
import { cn } from "@/lib/utils";

interface NodeHealthBadgeProps {
  node: NodeContent;
  className?: string;
}

export function NodeHealthBadge({ node, className }: NodeHealthBadgeProps) {
  const isFree = MOCK_USER.subscriptionTier === "free";
  const { healthScore, healthLevel } = node;

  // 没有健康度数据的节点不显示徽章
  if (healthScore === undefined) return null;

  // 免费用户看到锁定状态
  if (isFree) {
    return (
      <div
        className={cn(
          "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-muted/80 backdrop-blur-sm border border-border/50",
          className
        )}
        title="升级解锁 AI 健康度诊断"
      >
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">--</span>
      </div>
    );
  }

  // 根据健康等级设置颜色
  const colors = {
    excellent: {
      bg: "bg-green-100",
      border: "border-green-300",
      text: "text-green-700",
      dot: "bg-green-500",
    },
    good: {
      bg: "bg-blue-100",
      border: "border-blue-300",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
    warning: {
      bg: "bg-yellow-100",
      border: "border-yellow-300",
      text: "text-yellow-700",
      dot: "bg-yellow-500",
    },
    critical: {
      bg: "bg-red-100",
      border: "border-red-300",
      text: "text-red-700",
      dot: "bg-red-500",
    },
  };

  const color = colors[healthLevel || "good"];

  return (
    <div
      className={cn(
        "absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md backdrop-blur-sm border shadow-sm transition-all hover:scale-105",
        color.bg,
        color.border,
        className
      )}
      title={`健康度: ${healthScore}/100 (${healthLevel})`}
    >
      <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", color.dot)} />
      <span className={cn("text-xs font-bold", color.text)}>{healthScore}</span>
    </div>
  );
}
