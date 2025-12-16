# Design Document: Langfuse Observability Integration

**Change ID**: `integrate-langfuse-observability`
**Created**: 2025-12-15

## Overview

This document captures the architectural reasoning and design decisions for integrating Langfuse observability into CrossMind's AI infrastructure.

## Context

### Current State

**Observability Infrastructure**:
- `instrumentation.ts` uses `@vercel/otel` with `registerOTel` helper
- Basic OpenTelemetry export to Vercel Analytics
- Minimal AI-specific tracing

**AI Infrastructure**:
- Two chat APIs: General chat and Canvas chat
- Vercel AI SDK v5 with `streamText` for LLM calls
- 7+ AI tools invoked during chat sessions
- TokenLens for operational token tracking (writes to database)
- Streaming SSE responses with `createUIMessageStream`

**Limitations**:
1. **No AI-specific observability**: Can't see LLM calls, tool executions, or token usage in traces
2. **Streaming trace loss**: SSE responses complete before traces are flushed
3. **Missing business context**: Traces don't link to users, projects, or nodes
4. **Production debugging**: Limited ability to debug AI issues without comprehensive traces

### Why Langfuse?

Langfuse is an AI-native observability platform specifically designed for LLM applications. It provides:

- **LLM-aware tracing**: Automatic capture of prompts, completions, tokens, costs
- **Tool execution tracking**: Visibility into function calling patterns
- **Prompt management**: Version control and A/B testing for system prompts
- **User attribution**: Link traces to users and sessions for behavior analysis
- **Cost analytics**: Track token usage and costs per user/project/model

**Alternatives Considered**:
1. **Vercel Analytics only**: Not AI-specific, limited LLM insights
2. **LangSmith**: Similar to Langfuse but less Next.js integration
3. **Helicone**: Proxy-based, requires routing all LLM calls through proxy
4. **Custom logging**: High maintenance, no UI, no analytics

**Decision**: Langfuse offers the best balance of features, Next.js integration, and developer experience.

## Design Decisions

### Decision 1: Langfuse OTEL Integration

**Options Evaluated**:

| Option | Approach | Pros | Cons | Decision |
|--------|----------|------|------|----------|
| **A: Langfuse OTEL** | `@langfuse/otel` + manual NodeTracerProvider | Official integration, auto-traces tools, future-proof | Conflicts with `@vercel/otel`, requires manual setup | ✅ **SELECTED** |
| **B: langfuse-vercel** | `langfuse-vercel` SDK with LangfuseExporter | Works with existing `@vercel/otel` | **DEPRECATED** (Langfuse v4, Aug 2025) | ❌ Rejected |
| **C: Direct SDK** | `@langfuse/tracing` without OTEL | More control over traces | Must manually instrument every AI call, no auto tool tracing | ❌ Rejected |

**Rationale**:
- Option A is the official, supported approach as of Langfuse v4 (August 2025)
- Automatic tool tracing via Vercel AI SDK's `experimental_telemetry` saves significant development time
- Breaking change (`@vercel/otel` removal) is acceptable since manual NodeTracerProvider provides same functionality plus Langfuse

**Impact**:
- **Breaking**: Remove `@vercel/otel` dependency and `registerOTel()` call
- **Migration**: Replace with manual `NodeTracerProvider` + `LangfuseSpanProcessor`
- **Vercel Analytics**: Can still be supported via manual OTLP exporter (optional dual export)

### Decision 2: Trace Wrapper Pattern

**Challenge**: How to create parent traces for chat sessions that encompass all LLM calls and tool executions?

**Options**:

| Option | Approach | Pros | Cons | Decision |
|--------|----------|------|------|----------|
| **A: observe() wrapper** | Wrap route handlers with `observe()` from `@langfuse/tracing` | Clean API, automatic trace creation, minimal code | Requires `endOnExit: false` for streaming | ✅ **SELECTED** |
| **B: Manual trace creation** | Call `langfuse.trace()` manually | Full control | More boilerplate, error-prone | ❌ Rejected |
| **C: Middleware** | Create Next.js middleware for tracing | DRY, applies to all routes | Overhead on non-AI routes, harder to customize | ❌ Rejected |

**Implementation**:
```typescript
export const POST = observe(
  async function handleChatRequest(request: Request) {
    // ... existing code ...
  },
  {
    name: "chat-api-handler",
    endOnExit: false, // Critical for streaming
  }
);
```

**Rationale**:
- `observe()` creates parent trace automatically
- Vercel AI SDK's `experimental_telemetry` creates child spans under active trace
- Clean separation: trace management vs business logic
- `endOnExit: false` keeps trace open during streaming responses

### Decision 3: Streaming Trace Flush Strategy

**Challenge**: SSE streaming completes before traces are flushed, resulting in lost data.

**Root Cause**:
- Langfuse batches spans and flushes every 10s by default
- Next.js serverless functions may terminate before flush completes
- SSE streams can last 30-60s, but response is sent before flush

**Solution**:

1. **Reduce Flush Interval**: `flushInterval: 5000` (5s instead of 10s)
2. **Use `after()` Hook**: Next.js 15+ provides `after()` for post-response work
3. **Force Flush**: Call `langfuseSpanProcessor.forceFlush()` in `after()` block

**Implementation**:
```typescript
// In instrumentation.ts
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  flushInterval: 5000, // 5s for faster flushing
});

// In route handler
after(async () => {
  try {
    await langfuseSpanProcessor.forceFlush();
  } catch (error) {
    console.warn("[Langfuse] Flush failed:", error);
  }
});
```

**Rationale**:
- `after()` runs after HTTP response sent (non-blocking)
- `forceFlush()` ensures all buffered spans are sent immediately
- Try-catch prevents Langfuse errors from breaking requests
- 5s interval reduces latency between span creation and flush

**Testing Requirement**:
- Verify traces appear in Langfuse within 10s of request completion
- Test long streaming sessions (>30s) to ensure no trace loss

### Decision 4: Metadata Enrichment Strategy

**Challenge**: How to link traces to CrossMind business entities (users, projects, chats, nodes)?

**Approach**: Two-layer metadata strategy:

1. **Trace-level metadata** (via `enrichTrace()`):
   - User ID, Session ID (chatId), Tags
   - High-level business context
   - Applied once per request

2. **Span-level metadata** (via `experimental_telemetry.metadata`):
   - Model ID, Project ID, Node ID, Framework
   - Operation-specific context
   - Applied to `streamText` span automatically

**Implementation**:
```typescript
// Trace-level (after auth)
enrichTrace(
  getTraceMetadataFromSession(session, {
    chatId: id,
    projectId: nodeContext?.projectId,
    nodeId: nodeContext?.nodeId,
    modelId: selectedChatModel,
    tags: ["chat", selectedVisibilityType],
  })
);

// Span-level (in streamText)
experimental_telemetry: {
  isEnabled: true,
  functionId: "chat-stream",
  metadata: {
    chatId: id,
    userId: session.user.id,
    modelId: selectedChatModel,
    toolsEnabled: selectedChatModel !== "chat-model-reasoning",
  },
}
```

**Rationale**:
- Trace-level: Allows grouping all LLM calls in a chat session
- Span-level: Allows filtering/analyzing specific LLM calls
- Separation: Trace = session context, Span = operation context
- Extensible: Easy to add Canvas-specific metadata (framework, nodeType)

**Canvas-Specific Metadata**:
- Add `projectId`, `nodeId`, `nodeType`, `framework` to Canvas chat traces
- Enables analysis: "Which frameworks generate most LLM calls?" "Which node types require most AI assistance?"

### Decision 5: TokenLens Coexistence

**Challenge**: Avoid duplicate token tracking between TokenLens and Langfuse.

**Analysis**:
- **TokenLens**: Operational tracking
  - Writes token counts to database (`chat.lastContext`)
  - Sent to frontend via `data-usage` stream event
  - Used for billing, quota enforcement, UI display
  - Business-critical, must continue functioning

- **Langfuse**: Observability tracking
  - Captures tokens via OpenTelemetry
  - Stores in Langfuse cloud (not local database)
  - Used for analytics, debugging, cost analysis
  - Non-critical, can fail gracefully

**Decision**: Keep both systems running independently.

**Rationale**:
- Different purposes: TokenLens = ops, Langfuse = observability
- Different storage: Database vs cloud analytics platform
- Different consumers: Application code vs developers/analysts
- No conflict: TokenLens runs in `onFinish` callback, Langfuse via OTEL spans
- Validation: Can compare TokenLens vs Langfuse counts (should match ±5%)

**Testing Requirement**:
- Verify token counts match between systems
- Ensure TokenLens continues functioning if Langfuse fails

### Decision 6: Error Handling & Graceful Degradation

**Principle**: Langfuse failures must never impact user experience.

**Strategies**:

1. **Optional Credentials**: Only enable Langfuse if credentials present
   ```typescript
   const langfuseEnabled = Boolean(
     process.env.LANGFUSE_SECRET_KEY &&
     process.env.LANGFUSE_PUBLIC_KEY
   );
   ```

2. **Try-Catch Wrappers**: All Langfuse operations wrapped
   ```typescript
   try {
     enrichTrace(metadata);
   } catch (error) {
     console.warn("[Langfuse] Failed to enrich trace:", error);
   }
   ```

3. **Silent Failures**: Log warnings, never throw errors
   - Flush failures: Log warning, don't crash request
   - Trace creation failures: Silently skip, request proceeds

4. **Non-Blocking Flush**: Use `after()` to flush post-response
   - Request completes immediately
   - Flush happens in background
   - Flush errors don't affect user

**Testing Requirement**:
- Test with missing credentials (should work without Langfuse)
- Test with invalid credentials (should log warning, work normally)
- Simulate network issues (should degrade gracefully)

### Decision 7: Performance Budget

**Target**: <50ms average latency overhead from Langfuse integration.

**Measurement**:
- Baseline: Measure average response time without Langfuse
- With Langfuse: Measure average response time with Langfuse enabled
- Overhead: `(Langfuse - Baseline) / Baseline * 100%`

**Optimization Strategies**:

1. **Non-Blocking Flush**:
   - Use `after()` to flush post-response
   - Zero impact on user-perceived latency

2. **Reduced Flush Interval**:
   - 5s instead of 10s
   - Faster trace submission
   - Minimal memory overhead

3. **Minimal Metadata**:
   - Only essential context in traces
   - Avoid deep object serialization
   - Use primitive values where possible

4. **Batching**:
   - LangfuseSpanProcessor batches spans automatically
   - Reduces network calls
   - Improves throughput

**Testing Requirement**:
- Benchmark with 20+ chat messages
- Calculate average overhead
- If >50ms, investigate flush interval tuning or metadata reduction

### Decision 8: Rollout Strategy

**Approach**: Incremental rollout with feature flags and monitoring.

**Phases**:

1. **Development** (Week 1):
   - Implement integration locally
   - Manual testing with test credentials
   - Verify all success criteria

2. **Staging** (Week 2):
   - Deploy to staging environment
   - Monitor for 1 week
   - Check error logs, trace volume, performance

3. **Production Canary** (Week 3):
   - Deploy to production
   - Enable for 10% of traffic initially
   - Monitor closely for issues

4. **Production Full Rollout** (Week 4):
   - Gradually increase to 50%, then 100%
   - Monitor cost (Langfuse pricing)
   - Document learnings

**Feature Flag**:
- Presence of `LANGFUSE_SECRET_KEY` acts as feature flag
- Can disable instantly by setting to empty string
- No code changes needed to enable/disable

**Monitoring**:
- Error rate: <0.1% Langfuse errors
- Trace coverage: >95% of AI requests
- Performance: <50ms overhead
- Cost: Within Langfuse free tier or budget

**Rollback Plan**:
- Immediate: Set `LANGFUSE_SECRET_KEY=""` in environment
- Code rollback: Revert `instrumentation.ts` to Vercel OTEL
- Investigate: Check Langfuse logs, flush intervals, trace volume
- Re-deploy: Fix in staging before re-enabling

## Architecture Diagrams

### Before: Current Observability Flow

```
User Request → Next.js Route Handler
    ↓
  Auth, Validation
    ↓
  streamText() → LLM API
    ↓
  Tool Executions
    ↓
  onFinish → TokenLens → Database
    ↓
  SSE Response → User
    ↓
  @vercel/otel → Vercel Analytics
```

**Gaps**:
- No AI-specific tracing
- Traces not linked to users/sessions
- Streaming completes before traces flushed

### After: Langfuse Integration

```
User Request → observe() wrapper (creates parent trace)
    ↓
  enrichTrace() → Add user/chat/project context
    ↓
  Auth, Validation
    ↓
  streamText() with experimental_telemetry
    ├─→ LLM API (auto-creates span)
    ├─→ Tool Executions (auto-creates child spans)
    └─→ onFinish → TokenLens → Database (unchanged)
    ↓
  SSE Response → User
    ↓
  after() → forceFlush() → Langfuse Cloud
    ↓
  NodeTracerProvider → Langfuse + Vercel Analytics
```

**Improvements**:
- Parent trace for entire chat session
- Automatic child spans for LLM calls and tools
- Rich metadata (user, project, node, framework)
- Non-blocking flush after response
- TokenLens continues operating unchanged

### Trace Hierarchy

```
Trace: chat-api-handler
├── userId: cdfbc0e9-e288-478c-87e5-f7057591e5a1
├── sessionId: chat-abc123
├── tags: ["chat", "private"]
└── metadata: { chatId, modelId, projectId, ... }

    └── Span: streamText
        ├── Model: chat-model
        ├── Tokens: { input: 150, output: 500 }
        ├── Cost: $0.0045
        └── Latency: 2.3s

            ├── Span: createDocument (tool)
            │   ├── Input: { title: "API Design", kind: "text" }
            │   ├── Output: { id: "doc-xyz", content: "..." }
            │   └── Latency: 0.5s
            │
            ├── Span: updateDocument (tool)
            │   ├── Input: { id: "doc-xyz", description: "..." }
            │   ├── Output: { success: true }
            │   └── Latency: 0.3s
            │
            └── Span: requestSuggestions (tool)
                ├── Input: { documentId: "doc-xyz" }
                ├── Output: { suggestions: [...] }
                └── Latency: 1.2s
```

**Key Observations**:
- One trace per chat request
- `streamText` span is parent of all tool spans
- Tools traced automatically (no code changes in tool files)
- Metadata propagates to all child spans
- Token usage and costs captured automatically

## Trade-offs & Constraints

### Trade-off 1: Breaking Change vs Complexity

**Options**:
- A: Remove `@vercel/otel`, use manual NodeTracerProvider (breaking)
- B: Try to coexist with `@vercel/otel` (complex, unsupported)

**Decision**: Option A (breaking change)

**Rationale**:
- Langfuse OTEL requires `NodeTracerProvider` (conflicts with `registerOTel`)
- Manual setup is well-documented and straightforward
- Vercel Analytics can still be supported via OTLP exporter
- Clean architecture: one TracerProvider, multiple exporters

**Mitigation**:
- Document replacement clearly
- Test Vercel Analytics separately if needed
- Provide rollback instructions

### Trade-off 2: Flush Latency vs Trace Completeness

**Constraint**: Faster flush = higher network overhead, slower flush = potential trace loss

**Decision**: 5s flush interval (middle ground)

**Rationale**:
- 10s (default): Too slow for 60s serverless function limit
- 2s: Too frequent, high network overhead
- 5s: Reasonable balance for streaming scenarios

**Future Tuning**: If traces are lost, decrease to 3s; if network overhead is high, increase to 7s.

### Trade-off 3: Metadata Richness vs Performance

**Constraint**: More metadata = larger payloads = higher network cost

**Decision**: Essential metadata only

**Included**:
- User ID, Session ID (chatId), Project ID, Node ID
- Model ID, Framework, Node Type
- Tags (chat/canvas, visibility)
- Tools enabled flag

**Excluded**:
- Full message content (already in span via OTEL)
- User email/name (just ID for GDPR)
- Full node data (just nodeId reference)

**Rationale**:
- Metadata should be queryable identifiers, not full objects
- Full data available in Langfuse spans automatically
- Reduces payload size and indexing overhead

### Constraint: Next.js Serverless Function Limits

**Max Duration**: 60 seconds (enforced by `export const maxDuration = 60`)

**Implications**:
- Must flush traces before function terminates
- `after()` hook has limited time to execute
- Cannot rely on background processes

**Mitigation**:
- Use `forceFlush()` to send immediately
- Reduce flush interval to 5s
- Log warnings if flush fails (for debugging)

## Security & Privacy Considerations

### Data Sent to Langfuse

**Automatically Captured**:
- LLM prompts (system + user messages)
- LLM completions
- Tool names and parameters
- Token counts

**Metadata Added**:
- User ID (UUID, not email)
- Session ID (chatId)
- Project ID, Node ID (UUIDs)
- Model ID, Framework name

**NOT Sent**:
- User emails or names
- Passwords or API keys
- PII beyond user/project UUIDs

### GDPR Compliance

**User Data**:
- Langfuse stores user IDs (pseudonymized)
- Prompts may contain user PII
- Compliance: Langfuse is SOC 2 Type II certified, supports data deletion

**Recommendation**:
- Use Langfuse EU cloud for EU users
- Configure data retention policies in Langfuse dashboard
- Document in privacy policy that AI interactions are logged

### API Key Security

**Storage**:
- Environment variables (`.env.local`, Vercel environment variables)
- Never committed to git
- Server-only access (no client exposure)

**Rotation**:
- Langfuse supports key rotation via dashboard
- No code changes needed
- Update environment variables only

## Success Metrics

**Technical**:
- [ ] Trace coverage: >95% of AI requests have traces
- [ ] Performance overhead: <50ms average
- [ ] Error rate: <0.1% Langfuse errors
- [ ] Flush success: >99% of traces sent

**Business**:
- [ ] Token accuracy: Langfuse matches TokenLens (±5%)
- [ ] Cost tracking: Per-user/project attribution accurate
- [ ] Debugging speed: 50% reduction in investigation time
- [ ] User insights: Identify top users, most-used tools

**Observable**:
- [ ] All chat sessions visible in Langfuse dashboard
- [ ] Tool executions traced with input/output
- [ ] Token usage trends visible hourly/daily
- [ ] Error rates by tool/model trackable

## Future Enhancements

### Phase 2: Advanced Observability

1. **Database Tracing**:
   - Wrap critical queries in `langfuse.generation()`
   - Track query latency and error rates
   - Identify N+1 queries and slow operations

2. **Prompt Management**:
   - Store system prompts in Langfuse
   - Version control prompts independently
   - Link prompts to traces via metadata
   - A/B test prompt variants

3. **Custom Dashboards**:
   - Create project-specific views
   - Track Canvas metrics (nodes created, framework usage)
   - User cohort analysis (power users vs casual users)

### Phase 3: Evaluation & Feedback

1. **LLM-as-Judge Evaluations**:
   - Run evaluations on traces automatically
   - Score AI responses for quality, relevance, safety
   - Flag low-quality interactions for review

2. **User Feedback Loop**:
   - Capture thumbs up/down feedback
   - Link feedback to traces
   - Train on high-quality interactions

3. **Experiments**:
   - A/B test different models (Claude vs GPT)
   - Compare prompt variations
   - Measure impact of changes on quality/cost

## References

- [Langfuse Vercel AI SDK Integration Docs](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)
- [Vercel AI SDK Observability](https://ai-sdk.dev/providers/observability/langfuse)
- [Langfuse TypeScript SDK Instrumentation](https://langfuse.com/docs/observability/sdk/typescript/instrumentation)
- [Langfuse NextJS Example](https://github.com/langfuse/langfuse-vercel-ai-nextjs-example)
- [Langfuse v4 Changelog](https://langfuse.com/changelog/2024-08-02-vercel-ai-sdk-integration)
- [Next.js 15 `after()` Hook](https://nextjs.org/docs/app/api-reference/functions/after)
- [OpenTelemetry NodeTracerProvider](https://opentelemetry.io/docs/languages/js/instrumentation/)
