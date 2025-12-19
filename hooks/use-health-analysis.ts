"use client";

import { useState, useCallback, useRef } from "react";
import { generateUUID } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export type HealthAnalysisStatus =
  | "idle"
  | "starting"
  | "analyzing"
  | "completed"
  | "error";

export interface HealthAnalysisState {
  chatId: string | null;
  status: HealthAnalysisStatus;
  messages: ChatMessage[];
  error: string | null;
}

export function useHealthAnalysis() {
  const [state, setState] = useState<HealthAnalysisState>({
    chatId: null,
    status: "idle",
    messages: [],
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(
    async ({
      projectId,
      projectFrameworkId,
    }: {
      projectId: string;
      projectFrameworkId: string;
    }) => {
      // 1. 创建会话
      setState((prev) => ({ ...prev, status: "starting" }));

      try {
        const createResponse = await fetch(
          "/api/canvas/health-analysis/start",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, projectFrameworkId }),
          }
        );

        if (!createResponse.ok) {
          throw new Error("Failed to create analysis session");
        }

        const { chatId } = await createResponse.json();

        setState((prev) => ({ ...prev, chatId, status: "analyzing" }));

        // 2. 发起分析（建立 SSE 连接）
        abortControllerRef.current = new AbortController();

        const analysisResponse = await fetch(
          "/api/canvas/health-analysis/chat",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: chatId,
              message: {
                id: generateUUID(),
                role: "user",
                parts: [{ type: "text", text: "请开始分析框架健康度" }],
              },
            }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!analysisResponse.ok) {
          throw new Error("Failed to start analysis");
        }

        // 3. 读取 SSE 流
        const reader = analysisResponse.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body");
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                // 处理不同类型的数据流
                if (data.type === "data-appendMessage") {
                  const message = JSON.parse(data.data);
                  setState((prev) => ({
                    ...prev,
                    messages: [...prev.messages, message],
                  }));
                }
                // 可以添加其他数据类型的处理（如工具调用进度）
              } catch (e) {
                console.warn("[Health Analysis] Failed to parse SSE data:", e);
              }
            }
          }
        }

        // 分析完成
        setState((prev) => ({ ...prev, status: "completed" }));
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("[Health Analysis] Aborted by user");
        } else {
          console.error("[Health Analysis] Error:", error);
          setState((prev) => ({
            ...prev,
            status: "error",
            error: error.message,
          }));
        }
      }
    },
    []
  );

  const stopAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({ ...prev, status: "idle" }));
  }, []);

  return {
    state,
    startAnalysis,
    stopAnalysis,
  };
}
