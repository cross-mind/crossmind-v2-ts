# Capability: Streaming Trace Management

**Related Changes**: `integrate-langfuse-observability`
**Status**: Draft

## ADDED Requirements

### Requirement: Non-Blocking Trace Flushing
The system MUST flush traces asynchronously after HTTP responses are sent to avoid blocking user requests.

**Rationale**: Langfuse batches spans and flushes periodically. If flushing happens during request processing, it adds latency to user responses. Flushing after responses ensures zero performance impact on users.

**Acceptance Criteria**:
- Use Next.js `after()` hook to schedule post-response work
- Call `langfuseSpanProcessor.forceFlush()` in `after()` block
- Wrap flush calls in try-catch to prevent unhandled errors
- Log warnings if flush fails but don't crash application

#### Scenario: Trace flushed after streaming response completes
**Given** user sends a chat message that triggers AI streaming
**When** the SSE stream completes and response is sent to user
**Then** the `after()` hook is invoked
**And** `langfuseSpanProcessor.forceFlush()` is called
**And** the trace is sent to Langfuse within 10 seconds
**And** if flush fails, a warning is logged but the application continues

#### Scenario: Flush error doesn't break user experience
**Given** Langfuse API is temporarily unavailable
**When** a chat message completes and flush is attempted
**Then** the flush fails gracefully with a logged warning
**And** the user receives their chat response normally
**And** no error is shown to the user
**And** subsequent requests continue to function

---

### Requirement: Streaming-Aware Trace Lifecycle
The system MUST keep traces open during SSE streaming using `endOnExit: false` to ensure all spans are captured.

**Rationale**: SSE streaming can last 30-60 seconds. Default `observe()` behavior ends traces when the async function returns, which would close the trace before streaming completes.

**Acceptance Criteria**:
- Route handlers wrapped with `observe()` use `endOnExit: false` option
- Traces remain open for the duration of SSE streaming
- All tool executions during streaming are captured in the trace
- Traces are closed only after `forceFlush()` completes in `after()` block

#### Scenario: Long streaming session captures all spans
**Given** user sends a chat message that takes 30 seconds to stream
**When** the AI generates response with multiple tool executions
**Then** the trace remains open for the entire 30-second duration
**And** all tool execution spans are captured under the parent trace
**And** the trace includes the full token count for the complete response
**And** the trace is closed only after the `after()` hook completes

---

### Requirement: Reduced Flush Interval for Streaming
The system SHALL use a reduced flush interval (5 seconds instead of default 10 seconds) to ensure traces are sent before serverless functions terminate.

**Rationale**: Next.js serverless functions have a maximum duration of 60 seconds. A 10-second flush interval risks traces being lost if the function terminates before the next flush cycle.

**Acceptance Criteria**:
- `LangfuseSpanProcessor` configured with `flushInterval: 5000`
- Spans are sent to Langfuse every 5 seconds or on `forceFlush()`
- All traces are successfully sent before serverless function timeout
- Network overhead from more frequent flushing is acceptable (<5% increase)

#### Scenario: Traces flushed before serverless timeout
**Given** a chat request takes 55 seconds to complete
**When** the streaming response is sent
**Then** traces are flushed at least once during the request (5s interval)
**And** a final `forceFlush()` is called in `after()` hook
**And** all spans are successfully sent to Langfuse before function terminates
**And** no traces are lost due to timeout

---

### Requirement: Trace Wrapper for Chat Routes
The system MUST wrap all chat API route handlers with `observe()` to create parent traces for chat sessions.

**Rationale**: `observe()` automatically creates a parent trace that encompasses all LLM calls and tool executions, providing a complete view of each chat interaction.

**Acceptance Criteria**:
- General chat API handler ([app/(chat)/api/chat/route.ts](../../app/(chat)/api/chat/route.ts)) wrapped with `observe()`
- Canvas chat API handler ([app/api/canvas/chat/route.ts](../../app/api/canvas/chat/route.ts)) wrapped with `observe()`
- Each `observe()` wrapper uses `endOnExit: false` option
- Each trace has a descriptive name ("chat-api-handler", "canvas-chat-api-handler")

#### Scenario: General chat creates parent trace
**Given** user sends a message in general chat
**When** the POST handler is invoked
**Then** a parent trace is created with name "chat-api-handler"
**And** all subsequent `streamText` and tool spans are children of this trace
**And** the trace persists for the duration of the request
**And** the trace is flushed after the response is sent

#### Scenario: Canvas chat creates parent trace
**Given** user sends a message in Canvas chat context
**When** the Canvas chat POST handler is invoked
**Then** a parent trace is created with name "canvas-chat-api-handler"
**And** all Canvas tool executions are children of this trace
**And** the trace includes Canvas-specific metadata (projectId, nodeId)

---

### Requirement: Performance Overhead Target
The system MUST maintain an average latency overhead of less than 50ms from Langfuse integration.

**Rationale**: Observability should not degrade user experience. A <50ms overhead is imperceptible to users and acceptable for the value provided.

**Acceptance Criteria**:
- Baseline latency measured without Langfuse (average of 20 requests)
- Latency with Langfuse measured (average of 20 requests)
- Overhead calculated as `(Langfuse - Baseline) / Baseline * 100%`
- Overhead is less than 50ms on average
- If overhead >50ms, flush interval is tuned or metadata is reduced

#### Scenario: Latency overhead within acceptable range
**Given** baseline average latency is 500ms for chat requests
**When** Langfuse integration is enabled
**Then** average latency increases to less than 550ms
**And** the overhead is less than 50ms (10% increase)
**And** user experience is not noticeably degraded

---

## MODIFIED Requirements

None (this is a new capability).

---

## REMOVED Requirements

None.
