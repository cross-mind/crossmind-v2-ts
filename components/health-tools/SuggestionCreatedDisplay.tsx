"use client";

import { CheckCircle, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SuggestionCreatedOutput = {
  suggestionId: string;
  message: string;
};

export function SuggestionCreatedDisplay({ output }: { output: SuggestionCreatedOutput }) {
  return (
    <div className="rounded-md border border-green-200 bg-green-50/50 p-3">
      <div className="flex items-start gap-2">
        <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-green-900 text-sm font-medium">{output.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <Lightbulb className="h-3 w-3 text-green-600" />
            <span className="text-green-700 text-xs">
              建议 ID: {output.suggestionId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
