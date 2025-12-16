import { LangfuseSpanProcessor } from "@langfuse/otel";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { checkDatabaseConnection } from "./lib/db";

// Export span processor for manual flush in routes
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
  flushInterval: 5000, // 5 seconds for streaming scenarios
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

  // Create and register tracer provider
  const tracerProvider = new NodeTracerProvider({
    spanProcessors,
  });

  tracerProvider.register();

  console.log("[Instrumentation] TracerProvider registered with", spanProcessors.length, "span processor(s)");

  // Test: Create a simple test span to verify Langfuse connection
  if (langfuseEnabled) {
    try {
      const tracer = tracerProvider.getTracer("test-tracer");
      const span = tracer.startSpan("test-span");
      span.setAttribute("test", "initialization");
      span.end();
      console.log("[Instrumentation] Test span created");

      // Force flush to send immediately
      setTimeout(async () => {
        try {
          await langfuseSpanProcessor.forceFlush();
          console.log("[Instrumentation] Test span flushed to Langfuse");
        } catch (e) {
          console.error("[Instrumentation] Test span flush failed:", e);
        }
      }, 1000);
    } catch (e) {
      console.error("[Instrumentation] Failed to create test span:", e);
    }
  }

  console.log("[Instrumentation] Setup complete");
}
