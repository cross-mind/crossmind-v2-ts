# Capability: Metadata Enrichment

**Related Changes**: `integrate-langfuse-observability`
**Status**: Draft

## ADDED Requirements

### Requirement: Session-Aware Metadata
The system MUST link all traces to user sessions using NextAuth session data to enable user-level analytics.

**Rationale**: Linking traces to users enables critical analytics like top users, user cohort analysis, per-user cost tracking, and debugging user-specific issues.

**Acceptance Criteria**:
- Every trace includes `userId` from `session.user.id`
- Every trace includes `sessionId` (chatId for conversation grouping)
- Metadata extracted via `getTraceMetadataFromSession()` utility
- Traces queryable in Langfuse by userId or sessionId

#### Scenario: Trace linked to authenticated user
**Given** a user is logged in with test credentials (test@crossmind.dev)
**When** the user sends a chat message
**Then** the trace includes `userId: "cdfbc0e9-e288-478c-87e5-f7057591e5a1"`
**And** the trace includes `sessionId` matching the chatId
**And** the trace is queryable in Langfuse dashboard by userId
**And** all messages from the same chat are grouped under the same sessionId

---

### Requirement: Business Entity Linking
The system MUST link traces to CrossMind business entities (projects, nodes, chats) to enable entity-level analytics.

**Rationale**: Linking traces to projects and nodes enables analysis like "Which projects use most AI?" and "Which Canvas nodes require most assistance?"

**Acceptance Criteria**:
- General chat traces include `chatId` in metadata
- Canvas chat traces include `projectId` and `nodeId` in metadata
- Metadata added via `enrichTrace()` utility
- Traces queryable in Langfuse by projectId or nodeId

#### Scenario: General chat trace includes chatId
**Given** a user starts a new chat conversation
**When** the first message is sent
**Then** the trace includes `chatId` in metadata
**And** all subsequent messages in the conversation have the same `chatId`
**And** the chatId can be used to group all interactions in that conversation

#### Scenario: Canvas chat trace includes project and node context
**Given** a user is in Canvas view with a selected node
**When** the user sends a chat message to the AI assistant
**Then** the trace includes `projectId: "6f41921c-8970-4faa-a6c0-7180af8384ee"`
**And** the trace includes `nodeId` of the selected Canvas node
**And** the trace can be filtered in Langfuse dashboard by projectId or nodeId

---

### Requirement: AI Model Context
The system MUST capture which AI model was used for each request to enable model comparison and debugging.

**Rationale**: CrossMind uses different models (chat-model, chat-model-reasoning) with different capabilities. Tracking which model was used enables cost comparison and performance analysis.

**Acceptance Criteria**:
- Every trace includes `modelId` in metadata
- Reasoning model traces tagged to indicate tools are disabled
- Traces queryable in Langfuse by modelId
- Model latency and cost trackable per model

#### Scenario: Chat model captured in trace
**Given** a user sends a chat message using the standard chat model
**When** the message is processed
**Then** the trace includes `modelId: "chat-model"`
**And** the trace metadata includes `toolsEnabled: true`
**And** tool execution spans are present in the trace

#### Scenario: Reasoning model disables tools
**Given** a user sends a message using the reasoning model
**When** the message is processed
**Then** the trace includes `modelId: "chat-model-reasoning"`
**And** the trace metadata includes `toolsEnabled: false`
**And** no tool execution spans are present in the trace

---

### Requirement: Canvas Framework Context
The system MUST capture Canvas framework information (Lean Canvas, Design Thinking, etc.) to enable framework-specific analytics.

**Rationale**: CrossMind supports multiple thinking frameworks. Tracking which framework is active enables analysis like "Which frameworks generate most AI interactions?"

**Acceptance Criteria**:
- Canvas chat traces include `framework` name in metadata
- Canvas chat traces include `nodeType` (document, idea, task, inspiration)
- Metadata added via `experimental_telemetry.metadata` in Canvas chat route
- Traces queryable in Langfuse by framework or nodeType

#### Scenario: Lean Canvas context captured
**Given** a user is working in Lean Canvas framework
**And** the user selects a "Problem" zone node
**When** the user sends a chat message
**Then** the trace includes `framework: "lean-canvas"` in metadata
**And** the trace includes `nodeType` of the selected node
**And** the trace can be filtered by framework in Langfuse dashboard

---

### Requirement: Trace Tagging
The system MUST tag traces with contextual tags to enable filtering and categorization in Langfuse.

**Rationale**: Tags provide a quick way to filter traces (e.g., "show all Canvas traces" or "show all private chats") without complex queries.

**Acceptance Criteria**:
- General chat traces tagged with `["chat", visibility]` (e.g., `["chat", "private"]`)
- Canvas chat traces tagged with `["canvas", "node-chat"]`
- Tags added via `enrichTrace()` utility
- Traces filterable by tags in Langfuse dashboard

#### Scenario: Private chat tagged correctly
**Given** a user creates a private chat
**When** messages are sent in that chat
**Then** all traces include tags `["chat", "private"]`
**And** traces can be filtered by "chat" tag in Langfuse

#### Scenario: Canvas interaction tagged
**Given** a user is in Canvas chat context
**When** the user sends a message
**Then** the trace includes tags `["canvas", "node-chat"]`
**And** traces can be filtered by "canvas" tag in Langfuse

---

### Requirement: Centralized Metadata Utilities
The system MUST provide reusable utilities for metadata extraction and trace enrichment to ensure consistency across all routes.

**Rationale**: Centralized utilities prevent duplication, ensure consistent metadata structure, and simplify future updates.

**Acceptance Criteria**:
- `lib/observability/langfuse.ts` exports metadata utilities
- `enrichTrace(metadata: TraceMetadata): void` - Updates active trace
- `getTraceMetadataFromSession(session, context): TraceMetadata` - Extracts from NextAuth session
- All route handlers use these utilities instead of manual metadata construction

#### Scenario: Utilities provide consistent metadata structure
**Given** both general chat and Canvas chat routes use metadata utilities
**When** traces are created from each route
**Then** both routes produce traces with the same metadata field names
**And** both routes handle missing session data gracefully
**And** both routes include userId and sessionId consistently

---

### Requirement: Span-Level Telemetry Metadata
The system MUST include operation-specific metadata in `streamText` spans via `experimental_telemetry.metadata`.

**Rationale**: Span-level metadata provides fine-grained context for individual LLM calls, complementing trace-level metadata.

**Acceptance Criteria**:
- All `streamText()` calls include `experimental_telemetry` with `metadata` object
- Metadata includes chatId, userId, modelId, and operation-specific context
- Canvas chat includes projectId, nodeId, nodeType, framework in span metadata
- Metadata visible in Langfuse span details

#### Scenario: Span metadata enriches trace
**Given** a chat message is processed
**When** `streamText()` is called
**Then** the resulting span includes metadata with chatId, userId, modelId
**And** the metadata is visible in Langfuse span details
**And** the metadata enables filtering spans independently of traces

---

### Requirement: Graceful Metadata Errors
The system MUST handle metadata enrichment errors gracefully without breaking user requests.

**Rationale**: Metadata enrichment is non-critical. If it fails (e.g., session data missing), the request should proceed normally with reduced observability rather than failing.

**Acceptance Criteria**:
- All metadata utilities wrapped in try-catch blocks
- Errors logged as warnings, not thrown
- Requests proceed normally even if metadata enrichment fails
- Traces created with partial metadata if enrichment fails

#### Scenario: Missing session handled gracefully
**Given** a request arrives without a valid session (edge case)
**When** `getTraceMetadataFromSession()` is called
**Then** the function returns metadata with undefined userId
**And** no error is thrown
**And** the request proceeds normally
**And** a trace is created with partial metadata

#### Scenario: Enrichment failure doesn't break request
**Given** `enrichTrace()` encounters an unexpected error
**When** the error occurs during metadata enrichment
**Then** a warning is logged to console
**And** the error is not thrown
**And** the user's chat request completes normally
**And** a trace is created with default metadata

---

## MODIFIED Requirements

None (this is a new capability).

---

## REMOVED Requirements

None.
