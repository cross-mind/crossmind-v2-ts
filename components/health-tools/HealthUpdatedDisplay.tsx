"use client";

import { TrendingUp, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type HealthUpdatedOutput = {
  message: string;
  dimensionCount: number;
};

export function HealthUpdatedDisplay({ output }: { output: HealthUpdatedOutput }) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3">
      <div className="flex items-start gap-2">
        <TrendingUp className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-blue-900 text-sm font-medium">{output.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle className="h-3 w-3 text-blue-600" />
            <span className="text-blue-700 text-xs">
              已更新 {output.dimensionCount} 个维度评分
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
