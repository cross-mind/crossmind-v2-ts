# Capability: AI Observability

**Related Changes**: `integrate-langfuse-observability`
**Status**: Draft

## ADDED Requirements

### Requirement: OTEL-Based AI Tracing
The system MUST use OpenTelemetry with Langfuse integration to capture all AI interactions including LLM calls, tool executions, and token usage.

**Rationale**: OpenTelemetry provides industry-standard distributed tracing with automatic instrumentation when integrated with Vercel AI SDK's `experimental_telemetry`.

**Acceptance Criteria**:
- OpenTelemetry initialized with `NodeTracerProvider`
- `LangfuseSpanProcessor` registered with appropriate configuration
- Vercel AI SDK `experimental_telemetry` enabled on all `streamText()` calls
- Traces visible in Langfuse dashboard within 10 seconds of request completion

#### Scenario: Developer sends chat message
**Given** Langfuse credentials are configured in environment variables
**And** the development server is running
**When** a user sends a chat message "Create a document about API design"
**Then** a trace appears in Langfuse dashboard with name "chat-api-handler"
**And** the trace contains a child span for the `streamText` execution
**And** the trace contains a child span for the `createDocument` tool execution
**And** the trace includes input tokens, output tokens, and model latency

#### Scenario: AI tools execute during chat
**Given** a chat message requires tool execution
**When** the AI invokes `createDocument`, `updateDocument`, or `requestSuggestions` tools
**Then** each tool execution appears as a child span in the trace
**And** each tool span includes input parameters from Zod schema
**And** each tool span includes output/return value
**And** each tool span includes execution time in milliseconds

---

### Requirement: Manual TracerProvider Configuration
The system MUST use manual `NodeTracerProvider` configuration instead of `@vercel/otel`'s `registerOTel` helper to support Langfuse integration.

**Rationale**: Langfuse OTEL integration requires manual `NodeTracerProvider` setup and conflicts with `@vercel/otel`'s automatic registration.

**Acceptance Criteria**:
- `@vercel/otel` removed from dependencies
- `instrumentation.ts` uses `NodeTracerProvider` from `@opentelemetry/sdk-node`
- `LangfuseSpanProcessor` exported for `forceFlush()` access in routes
- Optional Vercel Analytics OTLP exporter configured if `process.env.VERCEL` is set

#### Scenario: Server starts with Langfuse configured
**Given** `LANGFUSE_SECRET_KEY` and `LANGFUSE_PUBLIC_KEY` are set in environment
**When** the Next.js application starts
**Then** `NodeTracerProvider` is registered with `LangfuseSpanProcessor`
**And** the console logs "[Langfuse] Observability enabled"
**And** the server starts without errors

#### Scenario: Server starts without Langfuse credentials
**Given** `LANGFUSE_SECRET_KEY` is not set in environment
**When** the Next.js application starts
**Then** `NodeTracerProvider` is registered without `LangfuseSpanProcessor`
**And** no Langfuse-related errors appear in console
**And** the server starts successfully
**And** chat functionality works normally (graceful degradation)

---

### Requirement: Automatic Tool Execution Tracing
The system MUST automatically trace all AI tool executions without requiring code changes in tool implementation files.

**Rationale**: Vercel AI SDK automatically creates child spans for tool executions when `experimental_telemetry` is enabled, reducing implementation overhead and ensuring consistency.

**Acceptance Criteria**:
- Tool files in `lib/ai/tools/` require no observability-specific code
- Tool executions appear as child spans under `streamText` span
- Tool spans include tool name, input parameters, output value, and execution time
- Both general chat tools and Canvas chat tools are traced

#### Scenario: Document creation tool executes
**Given** user sends chat message "Create a document about API design"
**When** the AI invokes the `createDocument` tool
**Then** a span appears in Langfuse with name "createDocument"
**And** the span input includes `{ title: "API Design", kind: "text" }`
**And** the span output includes `{ id: "doc-xyz", content: "..." }`
**And** the span execution time is captured in milliseconds

#### Scenario: Canvas node tool executes
**Given** user is in Canvas chat context
**And** user sends message "Create a new idea node about user feedback"
**When** the AI invokes the `createNode` tool
**Then** a span appears in Langfuse with name "createNode"
**And** the span input includes project ID, node ID, and node data
**And** the span output includes success status and created node ID
**And** the span is linked to the parent Canvas chat trace

---

### Requirement: Token Usage Tracking
The system MUST capture token usage (input tokens, output tokens) and costs for all LLM calls via OpenTelemetry.

**Rationale**: Token usage is critical for cost analysis, quota management, and performance optimization.

**Acceptance Criteria**:
- Every `streamText` span includes `input_tokens` and `output_tokens` metrics
- Token counts captured automatically via Vercel AI SDK telemetry
- Langfuse dashboard displays token usage per trace
- Token counts match TokenLens operational tracking (±5% tolerance)

#### Scenario: Token usage captured for chat message
**Given** user sends a chat message
**When** the LLM generates a response
**Then** the `streamText` span includes `input_tokens` metric
**And** the `streamText` span includes `output_tokens` metric
**And** the Langfuse dashboard displays total tokens for the trace
**And** the token counts match the TokenLens data shown in the UI (±5%)

---

### Requirement: Dual Exporter Support
The system SHALL support dual exporters (Langfuse + Vercel Analytics) to maintain existing Vercel observability while adding AI-specific insights.

**Rationale**: Vercel Analytics provides general application metrics that complement Langfuse's AI-specific observability.

**Acceptance Criteria**:
- If `process.env.VERCEL` is set, OTLP exporter to Vercel Analytics is configured
- Both Langfuse and Vercel Analytics receive traces
- Traces are not duplicated in either system
- Vercel Analytics dashboard continues to function

#### Scenario: Traces exported to both Langfuse and Vercel Analytics
**Given** application is deployed on Vercel
**And** `LANGFUSE_SECRET_KEY` is configured
**When** a chat message is processed
**Then** the trace appears in Langfuse dashboard
**And** the trace appears in Vercel Analytics dashboard
**And** no duplicate traces are created in either system

---

## MODIFIED Requirements

None (this is a new capability).

---

## REMOVED Requirements

None.
