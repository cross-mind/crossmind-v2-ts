<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CrossMind** is an AI-powered product development platform that integrates ideation, documentation, task management, and agent services. It extends Vercel's AI Chatbot with specialized tools for product teams, combining a chat interface with project management features.

**Package Manager**: This project uses **pnpm** exclusively. Do not use npm or yarn.

**Development Server**: This project runs on **port 8000** (not 3000) to avoid conflicts with other applications. NEVER kill the `pnpm dev` process without user permission, as other system applications may be running.

**Testing Requirement**: After **EVERY** development change, **MUST** test the application thoroughly:

1. **Chrome DevTools MCP Testing** (Mandatory when available):
   - Navigate to the affected pages
   - Test user interactions (clicks, form inputs)
   - Check console logs for errors
   - Verify network requests (API calls, status codes)
   - Take snapshots to verify UI state

2. **Server Logs Analysis** (Always required):
   - Monitor real-time console output during testing
   - Verify API endpoint responses
   - Check database queries and data flow

3. **Fallback Methods** (if Chrome DevTools unavailable):
   - curl commands for API testing
   - Direct database queries

**CRITICAL**: If Chrome DevTools MCP shows "Not connected", immediately report to user. Testing through browser is NOT optional - it catches issues that server logs miss.

**Documentation Maintenance**: When you encounter non-standard information, special bugs, or project-specific insights during development, update this CLAUDE.md file immediately. This includes:
- User-provided requirements that differ from standard practices
- Special bugs discovered during development and their solutions
- Project-specific workarounds or constraints
- Lessons learned that will help future AI assistants avoid the same issues

This ensures knowledge accumulation and prevents repeated mistakes.

## Test User Credentials

**IMPORTANT**: Use these fixed test credentials for ALL development and testing to avoid permission issues.

### Test Account
```
Email:       test@crossmind.dev
Password:    test123456
User ID:     cdfbc0e9-e288-478c-87e5-f7057591e5a1
Project ID:  6f41921c-8970-4faa-a6c0-7180af8384ee
Tier:        pro (500 health checks/month)
```

### Usage
- **Browser Testing**: Log in with test@crossmind.dev / test123456
- **API Testing**: Use User ID in session/auth headers
- **Database Testing**: Query with Project ID for project-specific data
- **Chrome DevTools MCP**: Always log in as test user before testing features

**Note**: This is a pro-tier account with full access to all features for comprehensive testing.

## Development Commands

### Core Development
```bash
pnpm dev              # Start development server on port 8000 with Turbo (fast mode)
pnpm build            # Build for production (runs DB migrations first)
pnpm start            # Start production server on port 8000
```

**IMPORTANT**: Development server runs on http://localhost:8000 (not 3000).

### Database Management
```bash
pnpm db:migrate       # Run database migrations (executes lib/db/migrate.ts)
pnpm db:generate      # Generate migration files from schema changes
pnpm db:studio        # Open Drizzle Studio (visual database editor)
pnpm db:push          # Push schema changes directly to database
pnpm db:pull          # Pull current database schema
```

### Code Quality
```bash
pnpm lint             # Run linting (Biome via Ultracite)
pnpm format           # Auto-fix code style issues
```

### Testing
```bash
pnpm test             # Run all Playwright E2E tests
# Tests located in tests/e2e/ and tests/routes/
# Configuration: playwright.config.ts
```

### Running Single Tests
```bash
# Run specific test file
npx playwright test tests/e2e/chat.test.ts

# Run tests matching pattern
npx playwright test --grep "chat functionality"

# Run in headed mode (see browser)
npx playwright test --headed
```

### Manual Testing

**Server Startup**: After running `pnpm dev`, wait a few seconds for server to be ready.

**Testing Workflow**:
1. Start the development server: `pnpm dev`
2. Test methods (in order of preference):
   a. **Chrome DevTools MCP** (if connected):
      - Navigate to pages
      - Test interactions
      - Check console logs
      - Verify network requests
   b. **Server logs** (always available):
      - Monitor console.log output
      - Verify API calls and data flow
   c. **Direct database queries**:
      - Query database directly for verification
   d. **curl commands**:
      - Test API endpoints directly

**Important**: If Chrome DevTools MCP shows "Not connected", immediately report to user. Don't waste time retrying.

**Chrome DevTools MCP Tools** (when connected):
- `mcp__chrome-devtools__navigate_page` - Navigate to URLs
- `mcp__chrome-devtools__take_snapshot` - Capture page state
- `mcp__chrome-devtools__click` - Test interactions
- `mcp__chrome-devtools__fill` - Test form inputs
- `mcp__chrome-devtools__list_console_messages` - Check for errors
- `mcp__chrome-devtools__list_network_requests` - Verify API calls
- `mcp__chrome-devtools__take_screenshot` - Visual verification

## Architecture Overview

### Five-Layer Architecture

CrossMind follows a hybrid architecture combining AI chat with project management:

1. **Client Layer**: Next.js App Router with Server + Client components
2. **API Gateway**: Next.js Route Handlers (app/api/)
3. **AI Layer**: Vercel AI SDK v5 with streaming and tools
4. **Workspace Container**: Isolated execution environment (planned)
5. **Data Persistence**: PostgreSQL with Drizzle ORM

### Route Organization

The app uses **route groups** for isolation:

```
app/
├── (auth)/          # Auth routes with AuthProvider
├── (chat)/          # Chat interface with DataStreamProvider
├── (crossmind)/     # Project features (Canvas, Tasks, Memory, etc.)
└── api/             # API route handlers
```

**Layout Hierarchy**:
- Root layout provides: ThemeProvider, SessionProvider, Toaster
- `(chat)` and `(crossmind)` layouts add: SidebarProvider, CrossMindSidebar, DataStreamProvider

### Database Architecture

**ORM**: Drizzle ORM with PostgreSQL (38 tables)

**Schema Location**: [lib/db/schema.ts](lib/db/schema.ts)

**Key Table Groups**:
- **Chat**: User, Chat, Message_v2, Vote_v2, Document, Suggestion
- **Projects**: Project, Membership
- **Canvas**: CanvasNode (hierarchical, multi-type), CanvasNodeActivity, CanvasNodeComment
- **Tasks**: Task, TaskTag, TaskComment, TaskActivity
- **Agents**: AgentService, AgentOrder, AgentIdentity
- **Knowledge**: ProjectDocument (RAG storage), ChatSession

**Query Functions**: [lib/db/queries.ts](lib/db/queries.ts)
- 30+ query functions organized by domain
- Server-only module (uses "server-only" import)
- Unified error handling via `ChatSDKError`

**Key Patterns**:
```typescript
// Type inference from schema
export type CanvasNode = InferSelectModel<typeof canvasNode>;

// JSONB for flexible data
positions: jsonb("positions")           // Framework-specific positioning
zoneAffinities: jsonb("zoneAffinities") // AI zone placement
healthData: jsonb("healthData")         // Health metrics
```

### AI Integration Architecture

**Provider Configuration**: [lib/ai/providers.ts](lib/ai/providers.ts)
- Uses `customProvider` from Vercel AI SDK
- Test mode: mock models
- Production: OpenRouter with Anthropic Claude models

**Models**: [lib/ai/models.ts](lib/ai/models.ts)
```typescript
"chat-model": anthropic/claude-sonnet-4 (via OpenRouter)
"chat-model-reasoning": anthropic/claude-sonnet-4 with <thinking> tags
"title-model": anthropic/claude-sonnet-4
"artifact-model": anthropic/claude-sonnet-4
```

**Why Anthropic Claude via OpenRouter**:
- Better tool calling compatibility than XAI models
- Avoids ZodError issues with Vercel AI SDK
- Supports structured outputs and reasoning middleware
- Access via OpenRouter proxy (single API key for multiple models)

**Chat Streaming**: [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts)

**Flow**:
```
Request → Validation → Auth → Rate Limit
  ↓
streamText() with Tools
  ↓
Tool Execution: createDocument, updateDocument, requestSuggestions, getWeather
  ↓
TokenLens enrichment → Usage tracking → SSE stream response
```

**AI Tools**: [lib/ai/tools/](lib/ai/tools/)
- Tools are first-class functions with Zod schemas
- Conditional availability based on model (reasoning model disables tools)

**System Prompts**: [lib/ai/prompts.ts](lib/ai/prompts.ts)
- Dynamic prompts based on model and mode
- Geolocation-aware context injection

### State Management Layers

CrossMind uses **multi-layered state management**:

1. **Server State**: PostgreSQL via Drizzle (single source of truth)
2. **Client Data Fetching**: SWR hooks ([hooks/use-canvas-nodes.ts](hooks/use-canvas-nodes.ts))
   - `useCanvasNodes(projectId)` - All nodes
   - `useCanvasNode(nodeId)` - Single node
   - Config: `revalidateOnFocus: false`, `dedupingInterval: 5000`
3. **Streaming State**: DataStreamProvider ([components/data-stream-provider.tsx](components/data-stream-provider.tsx))
   - Manages real-time AI streaming UI updates
4. **Local Component State**: Direct DOM manipulation for performance (Canvas page)
5. **Session State**: NextAuth v5 with extended user types

### Canvas System Architecture

The Canvas page ([app/(crossmind)/canvas/page.tsx](app/(crossmind)/canvas/page.tsx)) demonstrates sophisticated layout patterns:

**Dynamic Framework System**:
- Multiple thinking frameworks (Lean Canvas, Design Thinking, etc.)
- Zone-based positioning with affinity weights
- Framework-agnostic storage via JSONB `positions` and `zoneAffinities`

**Layout Algorithm**:
```typescript
1. getDynamicZoneConfigs() → Calculate grid positions per framework
2. Render nodes off-screen (x: -9999) for measurement
3. requestAnimationFrame() → Measure actual heights
4. Calculate positions using measured heights + greedy bin packing
5. Apply final positions with CSS transforms
```

**Performance Optimizations**:
- Direct DOM manipulation via `transformRef` for pan/zoom
- Debounced React state sync (`syncStateDebounced`)
- Transform origin: "0 0" for consistent scaling

**Node Types**: document, idea, task, inspiration (all stored in `CanvasNode` table)

**Health Scoring System**:
- `healthLevel`: "critical" | "warning" | "good" | "excellent"
- `healthData`: JSONB with detailed metrics
- Subscription-based limits (free: 0, basic: 100/month, pro: 500/month)

## Design System

CrossMind uses **Minimal Dense Layout (MDL)** inspired by Linear and Vercel.

**Core Principles** (from [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)):

1. **Structure Over Decoration**
   - Use `divide-y` instead of card borders
   - Minimize backgrounds, shadows, borders
   - Layout conveys hierarchy

2. **Information Density**
   - Single-line headers with integrated controls
   - Table-style list layouts (3 columns: Category + Content + Meta)
   - Hover to expand, default compact

3. **Functional Aesthetics**
   - Every element has clear function
   - Subtle hover effects (`hover:bg-muted/40`)
   - Text hierarchy via color: `foreground` → `muted-foreground` → `muted-foreground/60`

**Typography**:
- Page titles: `text-sm font-medium` (not text-lg)
- Content: `text-sm`
- Meta: `text-xs text-muted-foreground`
- Only use `font-medium` and `font-normal`

**Layout Pattern**:
```tsx
{/* Single-line header */}
<div className="flex items-center gap-4 px-6 py-3 border-b">
  <Icon className="h-4 w-4" />
  <h1 className="text-sm font-medium">Title</h1>
  <Input className="flex-1 max-w-md h-8" />
  <Button variant="ghost" size="sm">Filter</Button>
</div>

{/* Table-like list */}
<div className="divide-y divide-border/50">
  <div className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/40">
    <div className="w-24 shrink-0">{/* Fixed width column */}</div>
    <div className="flex-1 min-w-0">{/* Flexible content */}</div>
    <div className="shrink-0">{/* Fixed width meta */}</div>
  </div>
</div>
```

**Color System**:
- Pure white background: `oklch(1 0 0)`
- OKLCH color space for perceptual uniformity
- Border radius: Compact (0.3rem)

**Component Usage**:
- ✅ Use: `Button` (ghost/secondary), `Input`, `ScrollArea`, `Separator`, `divide-y`
- ❌ Avoid: `Card` for list items, `Badge` for categories, excessive `shadow-*`

## Key Architectural Patterns

### 1. Hybrid Server/Client Pattern
- **Server Components**: Data fetching, auth, database operations
- **Client Components**: Interactive UI, streaming, local state
- **Boundary**: API routes for async operations; hooks for client data

### 2. Tool-Based AI Interaction
```typescript
// Tools defined with schemas, conditionally available
tools: {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({ session, dataStream })
}
```

### 3. Multi-Domain Entity Relationships
`CanvasNode` participates in multiple systems:
- Standalone document
- Task with status/assignee
- Hierarchical structure (parentId/children)
- Linked to Tasks via `CanvasNodeTask`
- Referenced in RAG via `ProjectDocument`

### 4. Framework-Agnostic Storage
```typescript
// Same nodes work across multiple frameworks
positions: {
  "lean-canvas": { x, y },
  "design-thinking": { x, y }
}

zoneAffinities: {
  "lean-canvas": { "problem": 0.8, "solution": 0.3 },
  "design-thinking": { "empathize": 0.5, "define": 0.8 }
}
```

### 5. Activity Audit Trail
All major entities have activity tracking:
- `CanvasNodeActivity`: Node changes
- `TaskActivity`: Task updates
- Automatic creation on mutations
- Supports collaboration features

## Authentication & Authorization

**NextAuth v5** ([app/(auth)/auth.ts](app/(auth)/auth.ts)):

**Two Credential Providers**:
1. Regular: Email/password with bcrypt
2. Guest: Instant signup (guest-{timestamp})

**Session Extension**:
```typescript
session.user.id: string
session.user.type: "guest" | "regular"
```

**Entitlements by User Type**:
- Free: 0 health checks, limited rate
- Basic: 100 health checks/month
- Pro: 500 health checks/month

**Access Control**:
- Check session in route handlers
- Row-level security via ownership checks
- Project access via `Membership` table

## Data Flow Examples

### Chat Request
```
User Message → Save to DB → streamText()
  → Tool execution → TokenLens enrichment
  → Stream SSE → Save assistant message
  → Update chat.lastContext with usage
```

### Canvas Update
```
Node click → setSelectedNode → Right panel
  → Edit content → API call → updateCanvasNode()
  → Create activity → SWR mutate()
  → Optimistic UI update
```

### Framework Switch
```
Select framework → handleFrameworkChange()
  → Reset state → getDynamicZoneConfigs()
  → Measure heights → Calculate positions
  → CSS transform animation
```

## Critical Files Reference

### Core Architecture
- [lib/db/schema.ts](lib/db/schema.ts) - Full database schema (38 tables)
- [lib/db/queries.ts](lib/db/queries.ts) - Query functions by domain
- [lib/db/migrate.ts](lib/db/migrate.ts) - Migration runner

### AI Integration
- [lib/ai/providers.ts](lib/ai/providers.ts) - LLM provider configuration
- [lib/ai/models.ts](lib/ai/models.ts) - Model definitions
- [lib/ai/prompts.ts](lib/ai/prompts.ts) - System prompts
- [lib/ai/tools/](lib/ai/tools/) - AI tool definitions
- [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts) - Chat streaming API

### Canvas System
- [app/(crossmind)/canvas/page.tsx](app/(crossmind)/canvas/page.tsx) - Canvas implementation
- [hooks/use-canvas-nodes.ts](hooks/use-canvas-nodes.ts) - Data fetching hooks

### Layouts & Context
- [app/layout.tsx](app/layout.tsx) - Root layout
- [app/(chat)/layout.tsx](app/(chat)/layout.tsx) - Chat layout with streaming
- [components/data-stream-provider.tsx](components/data-stream-provider.tsx) - Streaming context

### Auth
- [app/(auth)/auth.ts](app/(auth)/auth.ts) - NextAuth v5 configuration

## Environment Setup

Required environment variables:
```env
AUTH_SECRET=****                    # Random secret for NextAuth
OPENROUTER_API_KEY=****            # OpenRouter API key (for AI models)
BLOB_READ_WRITE_TOKEN=****         # Vercel Blob storage token
POSTGRES_URL=****                  # PostgreSQL connection string
REDIS_URL=****                     # Redis connection URL (optional)
```

**Getting API Keys**:
- `OPENROUTER_API_KEY`: Get from https://openrouter.ai/
- `AUTH_SECRET`: Generate with `openssl rand -base64 32`
- See [.env.example](.env.example) for all available environment variables

## Langfuse AI Observability

**Integration Status**: ✅ Fully integrated and operational

CrossMind uses **Langfuse** for comprehensive AI observability, tracking all LLM calls, tool executions, token usage, and costs.

### Environment Configuration

Required environment variables (already in [.env.example](.env.example)):

```env
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_BASE_URL="https://us.cloud.langfuse.com"
```

**Getting Langfuse Credentials**:
1. Sign up at https://cloud.langfuse.com
2. Create a new project
3. Copy the Secret Key, Public Key, and Base URL from Settings → API Keys

### What Gets Traced

**Automatic Tracing** (via Vercel AI SDK `experimental_telemetry`):
- ✅ All `streamText()` LLM calls (general chat, canvas chat, health analysis)
- ✅ All AI tool executions (createDocument, updateDocument, createNode, etc.)
- ✅ Token usage (input tokens, output tokens, total tokens)
- ✅ Model latency and performance metrics
- ✅ Rich metadata (userId, chatId, projectId, nodeId, framework, etc.)

**What's NOT Traced**:
- ❌ Regular HTTP API requests (health checks, file uploads, etc.)
- ❌ Database queries
- ❌ Non-AI operations

### Architecture

**OTEL Integration** ([instrumentation.ts](instrumentation.ts)):
- Uses OpenTelemetry with `NodeTracerProvider`
- `LangfuseSpanProcessor` for trace export
- 5-second flush interval (optimized for serverless)
- Graceful degradation when credentials missing

**Automatic Trace Creation**:
```typescript
// In chat API routes (app/(chat)/api/chat/route.ts, app/api/canvas/chat/route.ts)
const result = streamText({
  model: myProvider.languageModel("chat-model"),
  experimental_telemetry: {
    isEnabled: true,
    functionId: "chat-stream",  // or "canvas-chat-stream"
    metadata: {
      chatId: id,
      userId: session.user.id,
      modelId: selectedChatModel,
      // ... additional context
    },
  },
});
```

**Non-Blocking Flush** (ensures traces sent before serverless termination):
```typescript
// Force flush traces after streaming completes
after(async () => {
  try {
    await langfuseSpanProcessor.forceFlush();
  } catch (error) {
    console.warn("[Langfuse] Flush failed:", error);
  }
});
```

### Key Implementation Details

**CRITICAL**: Do NOT use `observe()` wrapper from `@langfuse/tracing` on route handlers
- ❌ Wrong: `export const POST = observe(async function handleChatRequest() {...})`
- ✅ Correct: Use only `experimental_telemetry` in `streamText()` calls
- **Reason**: `observe()` traces ALL HTTP requests, not just AI operations

**Dual Export Support**:
- Langfuse for AI-specific observability
- Optional Vercel Analytics for general application metrics
- Both can run simultaneously without conflicts

**Coexistence with TokenLens**:
- TokenLens: Operational tracking (stored in database, shown in UI)
- Langfuse: Development/debugging observability (cloud-based analytics)
- Both systems run independently and complement each other

### Viewing Traces

1. Log into Langfuse dashboard: https://cloud.langfuse.com
2. Select your project
3. Navigate to "Traces" tab
4. Filter by:
   - User ID: Search for specific users
   - Function ID: `chat-stream`, `canvas-chat-stream`
   - Metadata: projectId, nodeId, modelId, etc.

**Trace Structure**:
```
Parent Trace (chat-stream)
├── Span: streamText (LLM call)
│   ├── Input tokens: 150
│   ├── Output tokens: 300
│   └── Latency: 2.5s
├── Span: createDocument (tool execution)
│   ├── Input: { title: "...", kind: "text" }
│   └── Output: { id: "...", content: "..." }
└── Span: updateDocument (tool execution)
    └── ...
```

### Debugging Langfuse

**Check if Langfuse is enabled**:
```bash
# Look for startup message in dev server logs
[Langfuse] Observability enabled ✅
```

**Common Issues**:

1. **No traces appearing**:
   - Verify credentials in `.env.local`
   - Check dev server logs for errors
   - Ensure you've sent an AI chat message (not just a regular HTTP request)
   - Wait 5-10 seconds for traces to appear (flush interval)

2. **Missing tool execution spans**:
   - Verify `experimental_telemetry` is enabled in `streamText()`
   - Check that tools are actually being called (not just available)

3. **Performance impact**:
   - Flush happens in `after()` hook (non-blocking)
   - 5-second interval reduces overhead
   - Typical overhead: <50ms per request

### Related Files

- [instrumentation.ts](instrumentation.ts) - OTEL configuration
- [lib/observability/langfuse.ts](lib/observability/langfuse.ts) - Utility functions (currently unused)
- [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts) - General chat telemetry
- [app/api/canvas/chat/route.ts](app/api/canvas/chat/route.ts) - Canvas chat telemetry
- [openspec/changes/integrate-langfuse-observability/](openspec/changes/integrate-langfuse-observability/) - OpenSpec proposal and specs

## Documentation

Comprehensive documentation in [docs/](docs/):
- [docs/PRD.md](docs/PRD.md) - Product requirements
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture hub
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) - UI/UX guidelines
- [docs/INTEGRATION_STATUS.md](docs/INTEGRATION_STATUS.md) - Implementation status
- [docs/requirements/](docs/requirements/) - Detailed business requirements (16 modules)
- [docs/architecture/](docs/architecture/) - Technical specs (7 sections)

## Git Conventions

Commit message prefixes:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Styling
- `refactor`: Code refactoring
- `test`: Testing
- `chore`: Build/tooling

## Git Worktree Development Workflow

**IMPORTANT**: All new feature development **MUST** use Git Worktree to maintain a clean separation between features and avoid disrupting the main workspace.

### Why Git Worktree?

Git Worktree allows multiple working directories from a single repository:
- **Isolation**: Each feature develops in its own directory without affecting main workspace
- **Parallel Development**: Work on multiple features simultaneously on different ports
- **Clean State**: Main workspace remains untouched during feature development
- **Easy Testing**: Switch between features without git stash/checkout cycles

### When to Use Git Worktree

**Always use Git Worktree for:**
- New feature development
- Experimental changes that span multiple files
- Refactoring that requires testing in isolation
- Any work that might need parallel development

**Skip Git Worktree for:**
- Quick bug fixes (1-2 file changes)
- Documentation-only updates
- Simple configuration changes

### Creating a New Worktree

```bash
# 1. Create worktree from latest main branch commit
# Format: git worktree add -b <branch-name> <directory> <base-branch>
git worktree add -b feature/your-feature-name ../crossmind-feature main

# Example:
git worktree add -b feature/dev-server-log-management ../crossmind-logs main
```

**Branch Naming Conventions:**
- Features: `feature/descriptive-name`
- Bug fixes: `fix/issue-description`
- Refactoring: `refactor/component-name`
- Experiments: `exp/experiment-name`

### Development Workflow

**1. Start Development**
```bash
# Navigate to worktree directory
cd ../crossmind-feature

# Verify you're on the feature branch
git branch --show-current

# Install dependencies if needed
pnpm install

# Start development server (will use different port)
pnpm dev
```

**2. Make Changes**
```bash
# Work normally in the worktree directory
# Edit files, run tests, commit changes

git add .
git commit -m "feat: add new feature"
```

**3. Test Thoroughly**
- Run all affected tests
- Test with Chrome DevTools MCP if available
- Verify server logs
- Check database migrations if applicable

**4. Prepare for Merge**
```bash
# Make sure all changes are committed
git status

# Rebase on latest main (if needed)
git fetch origin
git rebase origin/main
```

**5. Merge to Main**
```bash
# Switch back to main workspace
cd /Users/ivan/Workspace/crossmind

# Merge feature branch
git merge feature/your-feature-name

# Or use GitHub PR workflow:
# Push branch and create PR
git push origin feature/your-feature-name
```

**6. Cleanup Worktree**
```bash
# After merge, remove worktree
git worktree remove ../crossmind-feature

# Delete feature branch (if merged)
git branch -d feature/your-feature-name
```

### Managing Multiple Worktrees

```bash
# List all worktrees
git worktree list

# Remove stale worktrees
git worktree prune

# Move a worktree to a different location
git worktree move ../old-path ../new-path
```

### Dev Server Port Management

When using multiple worktrees:
- Each worktree can run its own dev server on different ports
- Use `pnpm dev` in each worktree - it will prompt for port selection if 8000 is taken
- Logs are isolated per port: `.logs/dev-server-{port}.log`
- Stop specific instances: `pnpm stop {port}`

### Best Practices

1. **One Feature Per Worktree**: Don't mix multiple features in one worktree
2. **Keep Worktrees Short-Lived**: Merge and cleanup promptly to avoid divergence
3. **Use Descriptive Names**: Both branch and directory names should be clear
4. **Commit Often**: Small, focused commits make review and debugging easier
5. **Test Before Merge**: Always verify functionality in the worktree before merging
6. **Clean Up After Merge**: Remove worktrees and delete merged branches

### Common Commands Reference

```bash
# Create worktree
git worktree add -b <branch> <path> <base>

# List worktrees
git worktree list

# Remove worktree
git worktree remove <path>

# Move worktree
git worktree move <old-path> <new-path>

# Prune stale worktrees
git worktree prune

# Lock/unlock worktree (prevent removal)
git worktree lock <path>
git worktree unlock <path>
```

## Common Patterns to Follow

### Adding New Database Tables
1. Define in [lib/db/schema.ts](lib/db/schema.ts) using Drizzle syntax
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply
4. Add query functions in [lib/db/queries.ts](lib/db/queries.ts)
5. Add TypeScript types: `export type TableName = InferSelectModel<typeof tableName>`

### Adding New AI Tools
1. Create tool file in [lib/ai/tools/](lib/ai/tools/)
2. Define with Zod schema for parameters
3. Register in chat route's `tools` object
4. Update system prompts if needed

### Adding New Pages
1. Create in appropriate route group: `app/(crossmind)/feature/page.tsx`
2. Use Server Component for data fetching
3. Add "use client" only for interactive components
4. Follow MDL design patterns (single-line header, table-style lists)
5. Add to sidebar navigation in [components/crossmind-sidebar.tsx](components/crossmind-sidebar.tsx)

### Component Development
1. Use shadcn/ui primitives from [components/ui/](components/ui/)
2. Follow MDL spacing: `px-6`, `py-3`, `gap-2/3/4`
3. Use standard text sizes: `text-sm`, `text-xs`
4. Hover states: `hover:bg-muted/40`, `transition-colors`
5. Avoid custom spacing values and unnecessary decorations

### Adding New API Routes with Authentication

**CRITICAL**: When creating API routes that use `auth()`, you **MUST** add `export const dynamic = "force-dynamic"` to prevent Next.js 16 prerendering errors.

**Why this is required**:
- Next.js 16 attempts to prerender routes during build by default
- `auth()` internally uses `headers()` which is not allowed during prerendering
- Without `dynamic = "force-dynamic"`, the build will fail with: `During prerendering, headers() rejects when the prerender is complete`

**Example**:
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic"; // ← REQUIRED for auth routes

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    // Your logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API Error]", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
```

**VSCode Snippet**: Type `api-auth-route` to generate the correct template with all required imports and exports.

**Verification**: Run `pnpm verify:routes` before committing to ensure all auth routes have dynamic markers.

**Exception**: Use `export const maxDuration = 60` instead if the route needs extended execution time (e.g., streaming endpoints).

## Langfuse 可观测性

CrossMind 使用 Langfuse 进行 AI 可观测性追踪，捕获所有 LLM 调用、工具执行和 token 使用情况。

### 环境配置

在 `.env.local` 中配置 Langfuse 凭证：

```env
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_BASE_URL="https://us.cloud.langfuse.com"
```

**获取 API 密钥**：
1. 创建 Langfuse 账号：https://cloud.langfuse.com
2. 在 Dashboard 中获取 API 密钥
3. 添加到 `.env.local`

### 自动追踪内容

**General Chat API** ([app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts))：
- 所有聊天会话（userId, chatId, modelId）
- 工具执行：`getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`
- Token 使用和成本

**Canvas Chat API** ([app/api/canvas/chat/route.ts](app/api/canvas/chat/route.ts))：
- Canvas 上下文（projectId, nodeId, framework）
- Canvas 工具：`createNode`, `updateNode`, `deleteNode`
- 节点类型和框架信息

### 追踪元数据结构

```
Trace (Chat Session)
├── userId: session.user.id
├── sessionId: chatId
├── tags: ["chat" | "canvas", visibility]
└── metadata
    ├── projectId (Canvas only)
    ├── nodeId (Canvas only)
    ├── modelId: "chat-model" | "chat-model-reasoning"
    ├── framework (Canvas only)
    └── toolsEnabled: boolean
```

### 架构说明

**OTEL 集成**：使用 Langfuse OTEL 集成，通过 Vercel AI SDK 的 `experimental_telemetry` 自动追踪：
- [instrumentation.ts](instrumentation.ts)：配置 `NodeTracerProvider` + `LangfuseSpanProcessor`
- 5 秒 flush 间隔，适配流式响应场景
- 使用 `after()` hook 在响应后非阻塞 flush
- **仅追踪 AI 操作**：通过 `streamText()` 的 `experimental_telemetry` 自动创建 traces，不使用 `observe()` wrapper

**与 TokenLens 共存**：
- **TokenLens**（现有）：运营追踪，写入数据库，用于计费和配额
- **Langfuse**（新）：可观测性追踪，存储在云端，用于分析和调试
- 两者独立运行，互不冲突

**重要说明**：
- Langfuse 仅在 `streamText()` 调用时自动创建 trace
- 不会追踪普通 HTTP 请求或非 AI 操作
- 所有 AI 工具执行自动作为子 span 追踪

### 调试

**启用 Debug 模式**：
在开发环境中，Langfuse 自动启用 debug 日志（`NODE_ENV === "development"`）

**查看追踪**：
- 访问 Langfuse Dashboard：https://cloud.langfuse.com
- 追踪在请求完成后 5-10 秒内出现
- 按 userId、chatId、projectId 筛选

**常见问题**：
1. **追踪未出现**：检查 `.env.local` 中的凭证是否正确
2. **Flush 失败**：查看服务器日志中的 `[Langfuse] Flush failed` 警告
3. **性能问题**：Langfuse 在 `after()` 中运行，不阻塞用户请求

### 关键实现细节

**experimental_telemetry 配置**：
- 在 `streamText()` 中启用 telemetry 自动创建 trace
- 添加丰富的 metadata：userId, chatId, modelId, projectId, nodeId 等
- 所有 AI 工具执行自动作为子 span 追踪
- 仅在 AI 调用时创建 trace，避免追踪普通 HTTP 请求

**forceFlush()**：
- 在 `after()` hook 中调用，确保追踪在 serverless 函数终止前发送
- 失败时优雅降级，仅记录警告
- 非阻塞设计，不影响用户响应时间

**Graceful Degradation**：
- 缺少凭证时自动禁用 Langfuse
- 所有 Langfuse 操作包裹在 try-catch 中
- 追踪失败不影响用户体验

## Known Issues & Solutions

### Canvas Component Type System
- **Issue**: When extracting Canvas components, must use shared `CanvasNode` type from `canvas-data.ts`
- **Reason**: Defining custom types causes conflicts (`parentId: string | null` vs `string | undefined`)
- **Solution**: Always import `type { CanvasNode } from "../canvas-data"` in Canvas components

### Canvas Tag Format
- **Issue**: Tags stored as simple strings (like `high`, `critical`) all appear in "OTHER" group in TagFilter
- **Reason**: TagFilter component expects tags in `namespace/value` format (like `priority/high`, `category/design`)
- **Solution**: Always use namespaced tags:
  - Priority tags: `priority/critical`, `priority/high`, `priority/medium`
  - Category tags: `category/design`, `category/dev`, `category/doc`, etc.
  - Type tags: `type/feature`, `type/idea`, `type/task`
  - Stage tags: `stage/ideation`, `stage/validation`, `stage/implementation`

### AI Provider Tool Calling Compatibility
- **Issue**: XAI models via OpenRouter return ZodError when using Vercel AI SDK's tool calling features
- **Symptoms**:
  - `ZodError: Invalid input: expected string, received array`
  - `Invalid option: expected one of 'completed'|'searching'|'in_progress'|'failed'`
  - API returns 200 OK but fails when calling AI provider
- **Root Cause**: Message format incompatibility between Vercel AI SDK and XAI models
- **Solution**: Use Anthropic Claude models via OpenRouter instead of XAI
- **Configuration**:
  - Keep `OPENROUTER_API_KEY` in `.env.local`
  - Provider config in [lib/ai/providers.ts](lib/ai/providers.ts) uses `openrouter("anthropic/claude-sonnet-4")`
  - Model: `anthropic/claude-sonnet-4` (not XAI models)
- **Benefits**: Better tool calling compatibility, stable with Vercel AI SDK, single API key for all models

### Chrome DevTools MCP
- 连接断开时立即报告用户，不要重试
- 使用替代测试方法：server logs, curl, test scripts

### Next.js 16 API Routes
- 动态参数从 `{ params: { id } }` 改为 `{ params: Promise<{ id }> }`
- 需要 `const { id } = await params`

### Database Composite Keys
- 不能同时有单独的 `id` 主键和复合主键
- 只保留复合主键：`primaryKey({ columns: [table.a, table.b] })`

### Node.js 25 localStorage SSR Errors
- **Issue**: Next.js 15.3.8 crashes with `TypeError: localStorage.getItem is not a function` during SSR, causing global 500 errors
- **Symptoms**:
  ```
  (node:XXXXX) Warning: `--localstorage-file` was provided without a valid path
  [TypeError: localStorage.getItem is not a function]
  GET / 500 in XXXXms
  ```
- **Root Cause**:
  - Node.js v25.2.1 introduced experimental Web Storage API support
  - Next.js DevOverlay component attempts to use `localStorage` during server-side rendering
  - Incompatibility between Node.js 25.x experimental features and Next.js 15.3.8
- **Solution**: Downgrade to Node.js LTS version
  ```bash
  # Use nvm or fnm to switch to Node.js LTS
  nvm install 22  # or: nvm install 20
  nvm use 22

  # Verify version
  node --version  # Should show v22.x.x or v20.x.x

  # Restart dev server
  pnpm dev
  ```
- **NOT Recommended**: Configuring `--localstorage-file` flag (adds unnecessary complexity)
- **When to Upgrade**: Wait for Next.js to add proper Node.js 25 compatibility or Node.js 26 LTS
- **Related**: This error originated from Next.js internal code, not application code

### VPN Environment Build Issues
- **Issue**: Next.js build fails to fetch Google Fonts with SSL certificate errors when using VPN
- **Root Cause**:
  - VPN routes `fonts.googleapis.com` through private DNS (198.18.0.2)
  - Resolves to VPN gateway IP (198.18.0.58) instead of Google's servers
  - VPN presents wrong SSL certificate (CN: upload.video.google.com)
- **Symptoms**:
  ```
  curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL
  Error while requesting resource: Failed to fetch Geist from Google Fonts
  ```
- **Solution**: Configure `.env.local` to skip TLS verification (local development only):
  ```bash
  NODE_TLS_REJECT_UNAUTHORIZED=0
  ```
- **Security Note**: Only use this in local development. Never deploy with this setting to production
- **Alternative Solutions**:
  1. Add `fonts.googleapis.com` to VPN bypass list
  2. Download fonts locally to `public/fonts/` and use local font files
  3. Use system fonts as fallback

### Next.js 15 vs 16 Build Compatibility
- **Issue**: Next.js 16 has regression bugs with `useContext` during prerendering
- **Solution**: Project uses Next.js 15.3.8 with experimental build mode
- **Build Command**: `next build --experimental-build-mode=compile`
- **Configuration**: Set in `package.json` scripts
- **Related Issues**:
  - [GitHub #85668](https://github.com/vercel/next.js/issues/85668) - useContext null error
  - [GitHub #82366](https://github.com/vercel/next.js/issues/82366) - 404/500 prerendering
- **When to Upgrade**: Wait for Next.js 16.1+ stable release with fixes

### Schema-Database Sync Issues
- **Issue**: Drizzle schema (schema.ts) becomes out of sync with actual database structure after partial rollbacks or incomplete migrations
- **Symptoms**:
  - API routes fail with errors like "column does not exist" or "export doesn't exist in target module"
  - `drizzle-kit push` wants to delete tables/columns with existing data
  - Import errors for tables that exist in database but not in schema
- **Root Causes**:
  1. Rolling back migrations without updating schema definitions
  2. Deleting table definitions from schema while they still exist in database
  3. Not verifying database state before schema changes
- **Prevention Best Practices**:
  1. **Always check database first**: Use SQL queries to verify actual structure before modifying schema
     ```bash
     # Check table columns
     POSTGRES_URL="..." node -e "..."  # See instrumentation.ts for examples
     ```
  2. **Schema reflects reality**: schema.ts should mirror the actual database, not desired state
  3. **Complete rollbacks**: When rolling back migrations, also rollback all related schema changes
  4. **Use drizzle-kit pull**: Pull schema from database instead of pushing when uncertain
     ```bash
     pnpm db:pull  # Pull current database schema
     ```
  5. **Incremental changes**: Modify one table at a time and test immediately
  6. **Migration verification**: After generating migrations, review SQL before applying
- **Recovery Steps**:
  1. Query database to get actual structure of all affected tables
  2. Add missing table definitions to schema.ts to match database
  3. Add missing column definitions to existing tables
  4. Restart dev server to clear Turbopack cache
  5. Verify all API routes return 200 status codes
- **Related Files**:
  - [lib/db/schema.ts](lib/db/schema.ts) - Schema definitions
  - [lib/db/queries.ts](lib/db/queries.ts) - Query functions using schema
  - [lib/db/migrations/](lib/db/migrations/) - Migration history

## Debugging

### Canvas Data Flow
- 使用三层日志系统：API → SWR → Component
- 用 `[Layer Name]` 前缀标识日志来源
- 示例：`[Canvas API]`, `[SWR Hook]`, `[Canvas Page]`
