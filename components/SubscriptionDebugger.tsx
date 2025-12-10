"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MOCK_USER } from "@/app/(crossmind)/canvas/canvas-data";

export function SubscriptionDebugger() {
  const [tier, setTier] = useState<"free" | "basic" | "pro">(MOCK_USER.subscriptionTier);

  const handleTierChange = (newTier: "free" | "basic" | "pro") => {
    setTier(newTier);
    MOCK_USER.subscriptionTier = newTier;
    // Force re-render by triggering a storage event
    window.dispatchEvent(new Event('subscription-tier-changed'));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-background shadow-lg border-2"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="text-xs">
              {tier === "free" && "🆓 Free"}
              {tier === "basic" && "⭐ Basic"}
              {tier === "pro" && "💎 Pro"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            调试工具 - 切换订阅等级
          </div>
          <DropdownMenuItem
            onClick={() => handleTierChange("free")}
            className="cursor-pointer"
          >
            <span className="mr-2">🆓</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Free</div>
              <div className="text-xs text-muted-foreground">无 AI 功能</div>
            </div>
            {tier === "free" && <span className="ml-2 text-primary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTierChange("basic")}
            className="cursor-pointer"
          >
            <span className="mr-2">⭐</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Basic</div>
              <div className="text-xs text-muted-foreground">$9/月 - AI 诊断</div>
            </div>
            {tier === "basic" && <span className="ml-2 text-primary">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleTierChange("pro")}
            className="cursor-pointer"
          >
            <span className="mr-2">💎</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Pro</div>
              <div className="text-xs text-muted-foreground">$29/月 - 无限制</div>
            </div>
            {tier === "pro" && <span className="ml-2 text-primary">✓</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
