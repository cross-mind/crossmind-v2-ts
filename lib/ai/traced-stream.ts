import type { StreamTextResult } from "ai";
import { streamText } from "ai";
import { after } from "next/server";
import { observe, updateActiveTrace } from "@langfuse/tracing";
import { langfuseSpanProcessor } from "@/instrumentation";

/**
 * Metadata for Langfuse trace enrichment
 */
export interface TraceMetadata {
  /** Trace name (e.g., "chat-stream", "canvas-chat-stream") */
  name: string;
  /** Session/Chat ID */
  sessionId: string;
  /** User ID */
  userId: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Tags for filtering traces */
  tags?: string[];
}

/**
 * Wrapped streamText() with Langfuse tracing
 *
 * This function automatically:
 * 1. Creates a parent trace using observe()
 * 2. Enriches trace with user/session metadata
 * 3. Enables experimental_telemetry for AI SDK auto-tracing
 * 4. Force flushes traces after streaming completes
 *
 * @example
 * ```ts
 * const result = await tracedStreamText({
 *   traceMetadata: {
 *     name: "chat-stream",
 *     sessionId: chatId,
 *     userId: session.user.id,
 *     metadata: { modelId: "chat-model" },
 *     tags: ["chat", "private"],
 *   },
 *   model: myProvider.languageModel("chat-model"),
 *   messages,
 *   tools,
 * });
 * ```
 */
export async function tracedStreamText<
  T extends Parameters<typeof streamText>[0] & { traceMetadata: TraceMetadata }
>(params: T): Promise<StreamTextResult<any>> {
  const { traceMetadata, ...streamParams } = params;

  // Enrich active trace with metadata
  updateActiveTrace({
    name: traceMetadata.name,
    sessionId: traceMetadata.sessionId,
    userId: traceMetadata.userId,
    metadata: traceMetadata.metadata,
    tags: traceMetadata.tags,
  });

  // Ensure experimental_telemetry is enabled
  const result = await streamText({
    ...streamParams,
    experimental_telemetry: {
      isEnabled: true,
      functionId: traceMetadata.name,
      metadata: {
        userId: traceMetadata.userId,
        sessionId: traceMetadata.sessionId,
        ...traceMetadata.metadata,
      },
    },
  } as any);

  // Force flush after streaming completes
  after(async () => {
    try {
      await langfuseSpanProcessor.forceFlush();
      console.log(`[Langfuse] Flushed traces for ${traceMetadata.name}:${traceMetadata.sessionId}`);
    } catch (error) {
      console.error(`[Langfuse] Flush failed for ${traceMetadata.name}:${traceMetadata.sessionId}`, error);
    }
  });

  return result;
}

/**
 * HOF to wrap an entire API handler with Langfuse observe()
 * Use this to create parent traces for streaming endpoints
 */
export function withLangfuseTrace<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  traceName: string
): T {
  return observe(handler, {
    name: traceName,
    endOnExit: false, // Keep trace open during SSE streaming
  }) as T;
}
