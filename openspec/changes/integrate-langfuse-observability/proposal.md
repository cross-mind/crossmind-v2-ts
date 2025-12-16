# Proposal: Integrate Langfuse Observability

**Change ID**: `integrate-langfuse-observability`
**Status**: Draft
**Created**: 2025-12-15

## Problem Statement

CrossMind currently has minimal AI observability. The existing `@vercel/otel` setup provides basic telemetry, but lacks:

- **AI-specific tracing**: No visibility into LLM calls, tool executions, or token usage across user sessions
- **Streaming trace management**: SSE responses complete before traces are flushed, resulting in lost observability data
- **Context-aware metadata**: No linking of traces to users, projects, nodes, or business entities
- **Cost analytics**: Token usage tracked via TokenLens but not integrated with observability platform for historical analysis
- **Production debugging**: Limited ability to debug AI-related issues in production without comprehensive trace data

**Current State**:
- `instrumentation.ts`: Uses `@vercel/otel` with `registerOTel`
- `experimental_telemetry`: Enabled only in production (`isProductionEnvironment`)
- Two chat APIs: general chat ([app/(chat)/api/chat/route.ts](../../app/(chat)/api/chat/route.ts)) and Canvas chat ([app/api/canvas/chat/route.ts](../../app/api/canvas/chat/route.ts))
- 7+ AI tools automatically invoked during chat sessions
- Environment variables for Langfuse already configured in `.env.example`

## Proposed Solution

Integrate **Langfuse** using the official OpenTelemetry integration to provide comprehensive AI observability across all chat interactions, tool executions, and model calls.

### Key Components

1. **OTEL Infrastructure Replacement** ([instrumentation.ts](../../instrumentation.ts))
   - Replace `@vercel/otel`'s `registerOTel` with manual `NodeTracerProvider` configuration
   - Add `LangfuseSpanProcessor` with 5s flush interval for streaming scenarios
   - Support dual exporters (Langfuse + optional Vercel Analytics)
   - Export span processor for `forceFlush()` calls in streaming routes

2. **Observability Utilities** ([lib/observability/langfuse.ts](../../lib/observability/langfuse.ts) - NEW)
   - Centralized metadata extraction from NextAuth sessions
   - Trace enrichment with user/project/chat/node context
   - Graceful error handling (never breaks user requests)
   - Reusable across all AI endpoints

3. **Chat API Integration**
   - Wrap route handlers with `observe()` from `@langfuse/tracing`
   - Enrich traces with CrossMind-specific metadata (userId, chatId, projectId, nodeId, modelId)
   - Enable `experimental_telemetry` with comprehensive metadata
   - Use `after()` from Next.js to `forceFlush()` traces post-response

4. **Automatic Tool Tracing**
   - No code changes required in tool files
   - Vercel AI SDK automatically traces all tool executions when `experimental_telemetry` is enabled
   - Tools traced: `getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`, `createNode`, `updateNode`, `deleteNode`

### Architecture Decision: Langfuse OTEL Integration

**Selected Approach**: `@langfuse/otel` + `@langfuse/tracing` with manual NodeTracerProvider

**Alternatives Considered**:
1. ❌ `langfuse-vercel` SDK - **DEPRECATED** as of Langfuse v4 (August 2025)
2. ❌ Direct `@langfuse/tracing` without OTEL - Requires manual instrumentation of every AI call, loses automatic tool tracing
3. ✅ **Langfuse OTEL Integration** - Official, future-proof, integrates seamlessly with Vercel AI SDK telemetry

**Critical Constraint**: Langfuse OTEL requires manual `NodeTracerProvider` setup and **cannot coexist** with `@vercel/otel`'s `registerOTel`. This is an acceptable breaking change since Vercel Analytics can still be supported via manual OTLP exporter configuration.

### Performance Safeguards

1. **Non-Blocking Design**:
   - Use `after()` from Next.js to flush traces after HTTP response sent
   - All Langfuse operations wrapped in try-catch to prevent request failures
   - Graceful degradation if credentials missing

2. **Streaming Optimization**:
   - `endOnExit: false` in `observe()` wrapper keeps trace open during streaming
   - Reduced flush interval (5s vs default 10s) for faster trace submission
   - `forceFlush()` in `after()` ensures traces sent before serverless function terminates

3. **Development vs Production**:
   - Debug mode auto-enabled in development for troubleshooting
   - Silent operation in production
   - Feature flag via environment variable presence

### Trace Metadata Structure

```
Trace (Chat Session)
├── userId: session.user.id
├── sessionId: chatId
├── tags: ["chat" | "canvas", visibility, ...]
└── metadata
    ├── projectId (Canvas only)
    ├── nodeId (Canvas only)
    ├── modelId: "chat-model" | "chat-model-reasoning"
    ├── framework (Canvas only)
    └── toolsEnabled: boolean

    └── Auto-captured Spans (Vercel AI SDK)
        ├── streamText execution
        │   ├── Input tokens, Output tokens
        │   ├── Model latency
        │   └── Cost (if model catalog configured)
        │
        └── Tool executions
            ├── Tool name
            ├── Input parameters (from Zod schema)
            ├── Output/return value
            └── Execution time
```

### Integration with Existing TokenLens

**No Conflict**: TokenLens and Langfuse track different layers:

- **TokenLens** (existing): Operational tracking
  - Writes token usage to database (`chat.lastContext`)
  - Sent to frontend via `data-usage` stream event
  - Used for billing/quota enforcement
  - Continues to function unchanged

- **Langfuse** (new): Observability tracking
  - Captures traces via OpenTelemetry
  - Historical analytics in Langfuse dashboard
  - No database writes
  - Used for debugging, cost analysis, performance monitoring

## Scope & Boundaries

### In Scope
- Replace `@vercel/otel` setup in `instrumentation.ts`
- Create `lib/observability/langfuse.ts` utility module
- Integrate Langfuse into general chat API ([app/(chat)/api/chat/route.ts](../../app/(chat)/api/chat/route.ts))
- Integrate Langfuse into Canvas chat API ([app/api/canvas/chat/route.ts](../../app/api/canvas/chat/route.ts))
- Automatic tracing of all AI tools via Vercel AI SDK telemetry
- Documentation updates in `CLAUDE.md`

### Out of Scope
- Database query tracing (future enhancement)
- Langfuse prompt management (future enhancement)
- Custom dashboards in Langfuse (post-launch)
- LLM-as-judge evaluations (future enhancement)
- User feedback loop integration (future enhancement)

### Dependencies
- **External**: Langfuse account with API keys (already configured in `.env.example`)
- **Package**: Install `@langfuse/otel`, `@langfuse/tracing`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-node`
- **Breaking Change**: Removes `@vercel/otel` integration (replaced with manual NodeTracerProvider)

## Success Criteria

### Technical Metrics
- ✅ Trace coverage: >95% of AI requests have traces in Langfuse
- ✅ Performance overhead: <50ms average latency increase
- ✅ Error rate: <0.1% Langfuse-related errors in logs
- ✅ Flush success: >99% of traces successfully sent to Langfuse

### Business Metrics
- ✅ Token accuracy: Langfuse token counts match TokenLens (±5%)
- ✅ Cost tracking: Accurate per-user and per-project cost attribution
- ✅ Debugging speed: 50% reduction in AI issue investigation time
- ✅ User insights: Identify top users, most-used tools, conversation patterns

### Observable Outcomes
- Langfuse dashboard shows all user chat sessions grouped by sessionId
- Tool executions visible with input/output parameters
- Token usage trends visible hourly/daily
- Error rates by tool and model trackable
- Latency percentiles (p50, p95, p99) for AI operations

## Testing Strategy

### Manual Testing
1. **Setup Verification**:
   - Install dependencies, configure `.env.local`, restart server
   - Verify Langfuse credentials loaded (check logs for "[Langfuse] Observability enabled")

2. **General Chat Testing**:
   - Send chat message, verify trace appears in Langfuse dashboard
   - Check metadata: userId, chatId, modelId
   - Test document creation tool, verify tool span captured
   - Test reasoning model (tools disabled), verify no tool spans

3. **Canvas Chat Testing**:
   - Navigate to Canvas, select node, send chat message
   - Verify Canvas metadata: projectId, nodeId, framework
   - Test createNode/updateNode/deleteNode tools

4. **Error Scenarios**:
   - Test with missing credentials (should gracefully disable)
   - Test with invalid credentials (should log warning, not crash)

5. **Performance Validation**:
   - Measure baseline latency (before Langfuse)
   - Measure latency with Langfuse (target: <50ms overhead)
   - Test long streaming conversations (>30s), verify traces flush

### Production Verification
- Monitor Langfuse dashboard for trace volume post-deployment
- Verify no missing traces (flush issues)
- Compare TokenLens vs Langfuse token counts (should match ±5%)
- Monitor server logs for Langfuse errors

## Rollout Plan

### Phase 1: Infrastructure Setup
- Install dependencies
- Create `lib/observability/langfuse.ts`
- Modify `instrumentation.ts` with NodeTracerProvider + LangfuseSpanProcessor

### Phase 2: General Chat Integration
- Modify [app/(chat)/api/chat/route.ts](../../app/(chat)/api/chat/route.ts)
- Add `observe()` wrapper, `enrichTrace()` calls
- Enable `experimental_telemetry` with metadata
- Manual testing

### Phase 3: Canvas Chat Integration
- Modify [app/api/canvas/chat/route.ts](../../app/api/canvas/chat/route.ts)
- Add Canvas-specific metadata
- Test Canvas tools tracing

### Phase 4: Production Rollout
- Deploy to staging, monitor for 1 week
- Deploy to production with feature flag (Langfuse credentials optional)
- Enable for 10% of users initially
- Gradually increase to 100%

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Performance degradation** | High | Non-blocking `after()` design, <50ms overhead target, comprehensive testing |
| **@vercel/otel conflict** | High | Complete replacement with NodeTracerProvider, test Vercel Analytics separately |
| **Streaming trace loss** | Medium | `endOnExit: false`, `forceFlush()`, reduced flush interval (5s) |
| **Missing credentials** | Low | Graceful degradation, clear documentation |
| **Cost overruns** | Medium | Monitor Langfuse usage, set trace retention limits |

### Fallback Plan
If production issues occur:
1. **Immediate**: Set `LANGFUSE_SECRET_KEY=""` to disable Langfuse
2. **Rollback**: Revert `instrumentation.ts` to Vercel OTEL only
3. **Investigate**: Check Langfuse logs, flush intervals, trace volume
4. **Re-deploy**: Fix issues in staging before re-enabling

## Related Changes

None (first OpenSpec change in this project).

## References

- [Langfuse Vercel AI SDK Integration](https://langfuse.com/integrations/frameworks/vercel-ai-sdk)
- [Vercel AI SDK Observability Docs](https://ai-sdk.dev/providers/observability/langfuse)
- [Langfuse TypeScript SDK Instrumentation](https://langfuse.com/docs/observability/sdk/typescript/instrumentation)
- [NextJs + Vercel AI SDK + Langfuse Example](https://github.com/langfuse/langfuse-vercel-ai-nextjs-example)
- [Langfuse v4 Changelog](https://langfuse.com/changelog/2024-08-02-vercel-ai-sdk-integration)

## Open Questions

1. **Vercel Analytics**: Should we maintain dual exporters (Langfuse + Vercel Analytics) or Langfuse only?
   - **Recommendation**: Support both via feature flags, as they serve different purposes (Langfuse = AI observability, Vercel = general application metrics)

2. **Database Tracing**: Should we add database operation tracing in Phase 1 or defer to Phase 2?
   - **Recommendation**: Defer to future enhancement. AI tracing provides immediate value; database tracing can be added incrementally.

3. **Flush Interval**: Is 5s optimal for streaming scenarios or should it be lower (e.g., 2s)?
   - **Recommendation**: Start with 5s based on Langfuse best practices, adjust if traces are lost during testing.

4. **Debug Mode**: Should debug logging be enabled in staging environment?
   - **Recommendation**: Yes, enable debug in staging (`NODE_ENV !== "production"`) to catch issues before production.
