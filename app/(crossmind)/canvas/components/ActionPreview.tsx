"use client";

import { Tag, FileText, MessageSquare, Sparkles } from "lucide-react";
import type { CanvasSuggestion } from "@/lib/db/schema";

interface ActionPreviewProps {
  suggestion: CanvasSuggestion;
  compact?: boolean;
}

/**
 * Preview component showing what the suggestion will do
 * Displays different content based on suggestion type
 */
export function ActionPreview({ suggestion, compact = false }: ActionPreviewProps) {
  const { type, actionParams } = suggestion;

  // add-tag preview
  if (type === "add-tag" && actionParams?.tags) {
    return (
      <div
        className={`${compact ? "mt-2" : "mt-3"} p-3 bg-blue-50 border border-blue-200 rounded`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Tag className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium text-blue-800">
            将添加以下标签:
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {actionParams.tags.map((tag: string, i: number) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // add-node preview
  if (type === "add-node" && actionParams?.newNode) {
    const { newNode } = actionParams;
    return (
      <div
        className={`${compact ? "mt-2" : "mt-3"} p-3 bg-green-50 border border-green-200 rounded`}
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-3 w-3 text-green-600" />
          <span className="text-xs font-medium text-green-800">
            将创建新节点:
          </span>
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium text-green-900">
            {newNode.title}
          </div>
          <div className="text-xs text-green-700 line-clamp-2">
            {newNode.content}
          </div>
          {newNode.tags && newNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {newNode.tags.map((tag: string, i: number) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // content-suggestion preview
  if (type === "content-suggestion" && actionParams?.suggestionPoints) {
    return (
      <div
        className={`${compact ? "mt-2" : "mt-3"} p-3 bg-purple-50 border border-purple-200 rounded`}
      >
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-3 w-3 text-purple-600" />
          <span className="text-xs font-medium text-purple-800">
            将在 AI Chat 中讨论以下要点:
          </span>
        </div>
        <ul className="space-y-1">
          {actionParams.suggestionPoints.map((point: string, i: number) => (
            <li
              key={i}
              className="text-xs text-purple-700 flex items-start gap-2"
            >
              <span className="text-purple-500 mt-0.5">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-purple-200">
          <p className="text-xs text-purple-600/80 italic">
            点击"与 AI 讨论"将打开 AI Chat 并预填充提示词
          </p>
        </div>
      </div>
    );
  }

  // refine-content preview
  if (type === "refine-content" && actionParams?.refinedContent) {
    return (
      <div
        className={`${compact ? "mt-2" : "mt-3"} p-3 bg-amber-50 border border-amber-200 rounded`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3 w-3 text-amber-600" />
          <span className="text-xs font-medium text-amber-800">
            优化后的内容:
          </span>
        </div>
        <div className="text-xs text-amber-900 whitespace-pre-wrap line-clamp-3">
          {actionParams.refinedContent}
        </div>
        <div className="mt-2 pt-2 border-t border-amber-200">
          <p className="text-xs text-amber-600/80 italic">
            点击"应用"将直接替换节点内容
          </p>
        </div>
      </div>
    );
  }

  return null;
}
