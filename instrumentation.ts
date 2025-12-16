import { LangfuseSpanProcessor, type ShouldExportSpan } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { checkDatabaseConnection } from "./lib/db";

// Filter function: only export AI-related spans
const shouldExportSpan: ShouldExportSpan = (span) => {
  const scopeName = span.otelSpan.instrumentationScope.name;
  const spanName = span.otelSpan.name;

  // Export all spans from AI SDK
  if (scopeName === "ai") {
    return true;
  }

  // Export test spans
  if (scopeName.includes("test")) {
    return true;
  }

  // Filter out all Next.js infrastructure spans
  if (scopeName === "next.js") {
    return false;
  }

  // Export everything else (to be safe)
  return true;
};

// Export span processor for manual flush in routes
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
  flushInterval: 5000, // 5 seconds for streaming scenarios
  exportMode: "immediate", // Export spans immediately instead of batching
  shouldExportSpan, // Filter out Next.js infrastructure spans
});

export function register() {
  console.log("[Instrumentation] register() called");

  // Check database connection asynchronously (non-blocking)
  checkDatabaseConnection()
    .then((result) => {
      if (result.connected) {
        console.log(`[Database] ✓ Connected successfully (latency: ${result.latency}ms)`);
      } else {
        console.error("[Database] ✗ Connection failed!");
        console.error("[Database] Error:", result.error);
        console.error("[Database] Please ensure PostgreSQL is running and accessible");
        console.error("[Database] Connection string:", process.env.POSTGRES_URL?.replace(/:[^:@]+@/, ':****@'));
      }
    })
    .catch((error) => {
      console.error("[Database] ✗ Health check failed:", error);
    });
  console.log("[Instrumentation] LANGFUSE_SECRET_KEY exists:", !!process.env.LANGFUSE_SECRET_KEY);
  console.log("[Instrumentation] LANGFUSE_PUBLIC_KEY exists:", !!process.env.LANGFUSE_PUBLIC_KEY);
  console.log("[Instrumentation] LANGFUSE_BASE_URL:", process.env.LANGFUSE_BASE_URL);

  const langfuseEnabled = Boolean(
    process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY
  );

  console.log("[Instrumentation] langfuseEnabled:", langfuseEnabled);

  const spanProcessors: SpanProcessor[] = [];

  // Add Langfuse processor if configured
  if (langfuseEnabled) {
    spanProcessors.push(langfuseSpanProcessor);
    console.log("[Langfuse] Observability enabled");
  } else {
    console.log("[Langfuse] Observability disabled - missing credentials");
  }

  // Optional: Dual export to Vercel Analytics
  if (process.env.VERCEL && process.env.VERCEL_TRACE_KEY) {
    const vercelExporter = new OTLPTraceExporter({
      url: "https://otel.vercel.com/v1/traces",
      headers: {
        "x-vercel-trace-key": process.env.VERCEL_TRACE_KEY,
      },
    });
    spanProcessors.push(new BatchSpanProcessor(vercelExporter));
    console.log("[Vercel Analytics] OTLP exporter enabled");
  }

  // Use NodeTracerProvider with manual registration (recommended by Langfuse)
  const tracerProvider = new NodeTracerProvider({
    spanProcessors,
  });

  tracerProvider.register();

  console.log("[Instrumentation] NodeTracerProvider registered with", spanProcessors.length, "span processor(s)");
  console.log("[Instrumentation] Setup complete");
}
