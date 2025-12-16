import { streamText } from "ai";
import { after } from "next/server";
import { trace, context } from "@opentelemetry/api";
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
}

/**
 * Wrapped streamText() with Langfuse OTEL tracing
 *
 * This function automatically:
 * 1. Enables experimental_telemetry for AI SDK auto-tracing via OTEL
 * 2. Passes user/session metadata to telemetry
 * 3. Force flushes traces after streaming completes
 *
 * NOTE: Does NOT use Langfuse SDK's observe() or updateActiveTrace()
 * to avoid tracing all HTTP requests. Only AI operations are traced.
 *
 * @example
 * ```ts
 * const result = await tracedStreamText({
 *   traceMetadata: {
 *     name: "chat-stream",
 *     sessionId: chatId,
 *     userId: session.user.id,
 *     metadata: { modelId: "chat-model" },
 *   },
 *   model: myProvider.languageModel("chat-model"),
 *   messages,
 *   tools,
 * });
 * ```
 */
export function tracedStreamText<
  T extends Parameters<typeof streamText>[0] & { traceMetadata: TraceMetadata }
>(params: T): ReturnType<typeof streamText> {
  const { traceMetadata, ...streamParams } = params;

  // Create a named root span for the trace with Langfuse-specific attributes
  const tracer = trace.getTracer("langfuse-tracer");
  const rootSpan = tracer.startSpan(traceMetadata.name, {
    attributes: {
      // Standard Langfuse attributes for trace metadata
      "langfuse.trace.name": traceMetadata.name,
      "langfuse.trace.userId": traceMetadata.userId,
      "langfuse.trace.sessionId": traceMetadata.sessionId,
      // AI SDK telemetry attribute
      "ai.telemetry.functionId": traceMetadata.name,
      // Additional metadata
      ...Object.fromEntries(
        Object.entries(traceMetadata.metadata || {}).map(([k, v]) => [
          `langfuse.trace.metadata.${k}`,
          String(v),
        ])
      ),
    },
  });

  const telemetryConfig = {
    isEnabled: true,
    functionId: traceMetadata.name,
    metadata: {
      userId: traceMetadata.userId,
      sessionId: traceMetadata.sessionId,
      ...traceMetadata.metadata,
    },
    // NOTE: Do NOT pass custom tracer - it breaks Langfuse integration
    // See: https://github.com/vercel/ai/issues/5120
    // AI SDK will use the globally registered TracerProvider instead
  };

  // Run streamText in the context of the root span
  const result = context.with(trace.setSpan(context.active(), rootSpan), () => {
    // Enable OTEL telemetry - this creates traces ONLY for AI operations
    // @ts-ignore - experimental_telemetry type mismatch but works at runtime
    return streamText({
      ...streamParams,
      experimental_telemetry: telemetryConfig,
    });
  });

  // End root span after streaming completes and force flush
  after(async () => {
    try {
      rootSpan.end();
      await langfuseSpanProcessor.forceFlush();
      console.log(`[Langfuse] Flushed traces for ${traceMetadata.name}:${traceMetadata.sessionId}`);
    } catch (error) {
      console.error(`[Langfuse] Flush failed for ${traceMetadata.name}:${traceMetadata.sessionId}`, error);
    }
  });

  return result;
}
