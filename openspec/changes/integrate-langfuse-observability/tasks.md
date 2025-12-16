# Implementation Tasks

**Change ID**: `integrate-langfuse-observability`

This document outlines the ordered implementation tasks for integrating Langfuse observability into CrossMind.

## Prerequisites

- [ ] Langfuse account created (cloud or self-hosted)
- [ ] API keys obtained and added to `.env.local`
- [ ] Development server stopped before package installation

## Phase 1: Infrastructure Setup (2-3 hours)

### Task 1.1: Install Dependencies
**Deliverable**: Langfuse packages installed and locked in `pnpm-lock.yaml`

```bash
pnpm add @langfuse/otel @langfuse/tracing @opentelemetry/sdk-node @opentelemetry/sdk-trace-node
```

**Validation**:
- Run `pnpm list @langfuse/otel` to confirm installation
- Verify `package.json` includes all 4 new dependencies

**Files Modified**: `package.json`, `pnpm-lock.yaml`

---

### Task 1.2: Create Observability Utilities Module
**Deliverable**: Reusable Langfuse utilities for trace management

**Implementation**: Create [lib/observability/langfuse.ts](../../lib/observability/langfuse.ts)

**Exports**:
- `enrichTrace(metadata: TraceMetadata): void` - Enrich active trace with CrossMind context
- `getTraceMetadataFromSession(session, context): TraceMetadata` - Extract metadata from NextAuth session
- `createTelemetryMetadata(traceId?, promptData?, customMetadata?)` - Create metadata for Vercel AI SDK telemetry
- `observeTool<TArgs, TResult>(toolName, execute)` - Wrapper for future custom tool instrumentation

**Key Features**:
- `"server-only"` import guard
- Graceful error handling (never breaks requests)
- TypeScript interfaces: `TraceMetadata`

**Validation**:
- TypeScript compilation: `npx tsc --noEmit`
- No runtime errors when importing in API routes

**Files Created**: `lib/observability/langfuse.ts`

---

### Task 1.3: Replace OTEL Instrumentation
**Deliverable**: Manual NodeTracerProvider setup with LangfuseSpanProcessor

**Implementation**: Modify [instrumentation.ts](../../instrumentation.ts)

**Changes**:
1. Remove `import { registerOTel } from "@vercel/otel"` and `registerOTel()` call
2. Import `LangfuseSpanProcessor`, `NodeTracerProvider`, `BatchSpanProcessor`, `OTLPTraceExporter`
3. Create and export `langfuseSpanProcessor` with:
   - Credentials from environment variables
   - `flushInterval: 5000` (5s for streaming scenarios)
   - `debug: process.env.NODE_ENV === "development"`
4. Conditionally add processors:
   - Langfuse processor if credentials present
   - Vercel OTLP exporter if `process.env.VERCEL` is set
5. Register `tracerProvider`

**Validation**:
- Start dev server: `pnpm dev`
- Check logs for `[Langfuse] Observability enabled` message
- Verify no OTEL errors in console
- Test that server starts without Langfuse credentials (graceful degradation)

**Files Modified**: `instrumentation.ts`

**Dependencies**: Requires Task 1.1 (packages installed)

---

## Phase 2: General Chat Integration (2-3 hours)

### Task 2.1: Wrap Chat API with Langfuse Tracing
**Deliverable**: General chat API handler wrapped with `observe()` for trace creation

**Implementation**: Modify [app/(chat)/api/chat/route.ts](../../app/(chat)/api/chat/route.ts)

**Changes**:
1. Add imports:
   ```typescript
   import { after } from "next/server";
   import { observe } from "@langfuse/tracing";
   import { langfuseSpanProcessor } from "@/instrumentation";
   import { enrichTrace, getTraceMetadataFromSession } from "@/lib/observability/langfuse";
   ```

2. Wrap `POST` handler:
   ```typescript
   export const POST = observe(
     async function handleChatRequest(request: Request) {
       // ... existing code ...
     },
     {
       name: "chat-api-handler",
       endOnExit: false, // Keep trace open for streaming
     }
   );
   ```

3. Add trace enrichment after auth:
   ```typescript
   enrichTrace(
     getTraceMetadataFromSession(session, {
       chatId: id,
       modelId: selectedChatModel,
       tags: ["chat", selectedVisibilityType],
     })
   );
   ```

4. Add `after()` flush before final `return`:
   ```typescript
   after(async () => {
     try {
       await langfuseSpanProcessor.forceFlush();
     } catch (error) {
       console.warn("[Langfuse] Flush failed:", error);
     }
   });
   ```

**Validation**:
- Send chat message via UI
- Check Langfuse dashboard for trace with `name: "chat-api-handler"`
- Verify trace includes `userId`, `chatId`, `tags`

**Files Modified**: `app/(chat)/api/chat/route.ts`

**Dependencies**: Requires Task 1.2 (utilities created), Task 1.3 (instrumentation configured)

---

### Task 2.2: Enable AI SDK Telemetry with Metadata
**Deliverable**: Comprehensive metadata sent to Langfuse via Vercel AI SDK telemetry

**Implementation**: Modify [app/(chat)/api/chat/route.ts](../../app/(chat)/api/chat/route.ts) within `streamText()` call

**Changes**:
```typescript
experimental_telemetry: {
  isEnabled: true, // Changed from: isProductionEnvironment
  functionId: "chat-stream",
  metadata: {
    chatId: id,
    userId: session.user.id,
    modelId: selectedChatModel,
    visibility: selectedVisibilityType,
    toolsEnabled: selectedChatModel !== "chat-model-reasoning",
  },
}
```

**Validation**:
- Send chat message
- Check Langfuse dashboard for `streamText` span
- Verify span includes `metadata.chatId`, `metadata.userId`, `metadata.modelId`
- Verify token usage captured (input tokens, output tokens)

**Files Modified**: `app/(chat)/api/chat/route.ts`

**Dependencies**: Requires Task 2.1 (observe wrapper added)

---

### Task 2.3: Test Tool Execution Tracing
**Deliverable**: Verify all chat tools are automatically traced

**Testing Steps**:
1. Test `createDocument` tool:
   - Send chat: "Create a document about API design"
   - Verify Langfuse shows tool span with input `{ title, kind }` and output `{ id, content }`

2. Test `updateDocument` tool:
   - Edit existing document via chat
   - Verify tool span shows update parameters

3. Test `requestSuggestions` tool:
   - Request suggestions for a document
   - Verify span shows suggestion generation

4. Test `getWeather` tool:
   - Ask "What's the weather in San Francisco?"
   - Verify external API call traced

5. Test reasoning model (tools disabled):
   - Switch to reasoning model
   - Verify no tool spans generated

**Validation Criteria**:
- All tool executions visible in Langfuse dashboard
- Tool spans show correct input/output parameters
- Tool execution time captured
- Reasoning model correctly disables tools

**Files Modified**: None (tools automatically traced)

**Dependencies**: Requires Task 2.2 (telemetry enabled)

---

## Phase 3: Canvas Chat Integration (1-2 hours)

### Task 3.1: Wrap Canvas Chat API with Langfuse Tracing
**Deliverable**: Canvas chat API handler wrapped with `observe()` for trace creation

**Implementation**: Modify [app/api/canvas/chat/route.ts](../../app/api/canvas/chat/route.ts)

**Changes**: Same pattern as Task 2.1, but with Canvas-specific metadata:
```typescript
enrichTrace(
  getTraceMetadataFromSession(session, {
    chatId: sessionId,
    projectId: nodeContext.projectId,
    nodeId: nodeContext.nodeId,
    modelId: "chat-model",
    tags: ["canvas", "node-chat"],
  })
);
```

**Validation**:
- Navigate to Canvas page, select node
- Send chat message in node panel
- Check Langfuse for trace with `projectId`, `nodeId` metadata

**Files Modified**: `app/api/canvas/chat/route.ts`

**Dependencies**: Requires Phase 2 complete

---

### Task 3.2: Enable Canvas Telemetry with Framework Context
**Deliverable**: Canvas framework metadata captured in traces

**Implementation**: Add telemetry metadata to `streamText()` in [app/api/canvas/chat/route.ts](../../app/api/canvas/chat/route.ts):
```typescript
experimental_telemetry: {
  isEnabled: true,
  functionId: "canvas-chat-stream",
  metadata: {
    chatId: sessionId,
    userId: session.user.id,
    projectId: nodeContext.projectId,
    nodeId: nodeContext.nodeId,
    nodeType: node.type,
    framework: framework?.name,
  },
}
```

**Validation**:
- Select Canvas node in different frameworks (Lean Canvas, Design Thinking, etc.)
- Send chat messages
- Verify Langfuse shows `framework` in metadata

**Files Modified**: `app/api/canvas/chat/route.ts`

**Dependencies**: Requires Task 3.1 (observe wrapper added)

---

### Task 3.3: Test Canvas Tool Tracing
**Deliverable**: Verify Canvas-specific tools are traced

**Testing Steps**:
1. Test `createNode` tool:
   - Ask AI to "Create a new idea node about user feedback"
   - Verify Langfuse shows `createNode` span with `projectId`, `nodeId`, node data

2. Test `updateNode` tool:
   - Ask AI to "Update this node's title"
   - Verify span shows update parameters

3. Test `deleteNode` tool:
   - Ask AI to "Delete this node"
   - Verify span shows deletion confirmation

**Validation Criteria**:
- All Canvas tools visible in Langfuse dashboard
- Tools include Canvas context (projectId, nodeId)
- Framework-specific metadata visible

**Files Modified**: None (tools automatically traced)

**Dependencies**: Requires Task 3.2 (telemetry enabled)

---

## Phase 4: Testing & Validation (2-3 hours)

### Task 4.1: Performance Benchmarking
**Deliverable**: Verified <50ms latency overhead from Langfuse

**Testing Steps**:
1. Baseline measurement (Langfuse disabled):
   - Send 20 chat messages
   - Record average response time

2. Langfuse enabled measurement:
   - Send 20 chat messages
   - Record average response time
   - Calculate overhead

**Success Criteria**:
- Average overhead <50ms
- No timeout errors in streaming scenarios
- Traces appear in Langfuse within 10 seconds

**Validation**:
- Document results in test log
- If overhead >50ms, investigate flush interval tuning

**Files Modified**: None (testing only)

---

### Task 4.2: Error Scenario Testing
**Deliverable**: Graceful degradation verified

**Testing Steps**:
1. Missing credentials:
   - Remove `LANGFUSE_SECRET_KEY` from `.env.local`
   - Restart server
   - Verify no crashes, chat still works
   - Check logs for silent disable message

2. Invalid credentials:
   - Set invalid API keys
   - Restart server
   - Verify chat works, warnings in logs

3. Network issues:
   - Simulate network failure (disconnect internet)
   - Send chat message
   - Verify request completes, Langfuse flush fails gracefully

**Success Criteria**:
- Chat functionality never broken by Langfuse issues
- Clear warning messages in logs
- No user-facing errors

**Files Modified**: None (testing only)

---

### Task 4.3: Token Usage Validation
**Deliverable**: Langfuse token counts match TokenLens

**Testing Steps**:
1. Send 10 varied chat messages (short, long, with tools, without tools)
2. For each message:
   - Check TokenLens data in chat UI (data-usage event)
   - Check Langfuse dashboard for same trace
   - Compare input tokens, output tokens

**Success Criteria**:
- Token counts match within ±5%
- Both systems track cost accurately

**Validation**:
- Document any discrepancies
- Investigate if >5% difference

**Files Modified**: None (testing only)

---

## Phase 5: Documentation & Deployment (1 hour)

### Task 5.1: Update CLAUDE.md
**Deliverable**: Documentation for future AI assistants

**Implementation**: Add section to [CLAUDE.md](../../CLAUDE.md):
```markdown
## Langfuse Observability

CrossMind uses Langfuse for AI observability and tracing.

**Setup**:
1. Create Langfuse account: https://cloud.langfuse.com
2. Get API keys from dashboard
3. Add to `.env.local`:
   ```
   LANGFUSE_SECRET_KEY="sk-lf-..."
   LANGFUSE_PUBLIC_KEY="pk-lf-..."
   LANGFUSE_BASE_URL="https://us.cloud.langfuse.com"
   ```

**What's Traced**:
- All AI chat requests (general + Canvas)
- Tool executions (document, suggestions, Canvas nodes)
- Token usage and costs
- User/session/project context

**Debugging**:
- Set `debug: true` in `instrumentation.ts` for verbose logs
- Check Langfuse dashboard: https://cloud.langfuse.com
- Traces flushed asynchronously (may take 5-10s to appear)

**Known Issues**:
- Langfuse OTEL conflicts with `@vercel/otel` - manual NodeTracerProvider required
- Streaming traces require `endOnExit: false` and `forceFlush()`
```

**Validation**:
- Read documentation as new developer
- Verify all steps clear and actionable

**Files Modified**: `CLAUDE.md`

---

### Task 5.2: Staging Deployment
**Deliverable**: Langfuse running in staging environment

**Steps**:
1. Commit changes to feature branch
2. Push to staging environment
3. Configure Langfuse environment variables in staging
4. Deploy
5. Monitor for 1 week:
   - Check error logs
   - Verify trace volume
   - Monitor performance metrics

**Success Criteria**:
- No Langfuse-related errors in staging
- Trace coverage >95%
- Performance within target (<50ms overhead)

**Files Modified**: None (deployment only)

---

### Task 5.3: Production Rollout
**Deliverable**: Langfuse enabled in production with feature flag

**Steps**:
1. Add Langfuse credentials to production environment variables
2. Deploy to production
3. Gradual rollout:
   - Week 1: 10% of traffic (via sampling if needed)
   - Week 2: 50% of traffic
   - Week 3: 100% of traffic
4. Monitor:
   - Error rates
   - Trace volume
   - Cost (Langfuse pricing)
   - User feedback

**Success Criteria**:
- No production incidents
- Trace coverage >95%
- Cost within budget

**Rollback Plan**:
- Set `LANGFUSE_SECRET_KEY=""` to immediately disable
- Revert deployment if needed

**Files Modified**: None (deployment only)

---

## Summary

**Total Estimated Time**: 8-12 hours

**Critical Path**:
1. Task 1.1 → 1.2 → 1.3 (Infrastructure)
2. Task 2.1 → 2.2 → 2.3 (General Chat)
3. Task 3.1 → 3.2 → 3.3 (Canvas Chat)
4. Task 4.1 → 4.2 → 4.3 (Testing)
5. Task 5.1 → 5.2 → 5.3 (Deployment)

**Parallelizable Work**:
- Task 1.2 can be done before 1.3
- Task 4.1, 4.2, 4.3 can run in parallel
- Documentation (5.1) can be done anytime after Phase 3

**Key Dependencies**:
- Phase 2 requires Phase 1 complete
- Phase 3 requires Phase 2 complete
- Phase 4 requires Phase 3 complete
- Phase 5 requires Phase 4 complete

**Rollback Points**:
- After Task 1.3: Can revert to Vercel OTEL
- After Task 2.3: Can disable general chat tracing
- After Task 3.3: Can disable Canvas tracing
- After Task 5.2: Can abort production rollout
