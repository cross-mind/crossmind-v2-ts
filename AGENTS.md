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

# AGENTS.md

Action-oriented guide for AI agents working on CrossMind codebase.

## How to Use This Guide

**AGENTS.md** (this file): Quick reference for common tasks, commands, and patterns
- Start here for quick lookups
- Action-oriented with specific commands
- Scannable format with bullets and code blocks
- Covers: setup, testing, known issues, architecture essentials

**CLAUDE.md**: Comprehensive documentation with detailed explanations
- Use for deep dives into architecture
- Detailed explanations of "why" and "how things work"
- Full context for complex systems (Canvas layout algorithm, AI integration, etc.)
- Historical context and design decisions

**When to update**:
- AGENTS.md: Add new quick fixes, commands, common patterns
- CLAUDE.md: Document architectural decisions, complex workflows, detailed explanations
- Both: Update when discovering project-specific bugs or workarounds

## Project Overview

**CrossMind** is an AI-powered product development platform that integrates ideation, documentation, task management, and agent services. It extends Vercel's AI Chatbot with specialized tools for product teams.

**Core Tech Stack**:
- **Framework**: Next.js 15.3.8 App Router with Server/Client components
- **Database**: PostgreSQL with Drizzle ORM (38 tables)
- **AI**: Vercel AI SDK v5 with Anthropic Claude via OpenRouter
- **Auth**: NextAuth v5 with email/password and guest providers
- **Observability**: Langfuse for AI tracing, TokenLens for billing

**Five-Layer Architecture**:
1. Client Layer (Next.js Server + Client components)
2. API Gateway (Next.js Route Handlers)
3. AI Layer (Vercel AI SDK with streaming and tools)
4. Workspace Container (planned)
5. Data Persistence (PostgreSQL + Drizzle ORM)

**Documentation Maintenance Protocol**:
When you discover bugs, workarounds, or project-specific insights, immediately update AGENTS.md or CLAUDE.md:
- User-provided requirements that differ from standard practices
- Special bugs and their solutions
- Project-specific constraints or workarounds
- Lessons learned to help future AI assistants

## Dev Environment Tips

### Package Management

- **Always use `pnpm`** - never npm or yarn
- Run `pnpm install` to install dependencies
- Add packages with `pnpm add <package-name>`

### Development Server

- **Port 8000** (not 3000): Start with `pnpm dev`
- **NEVER kill dev server without permission** - other apps may be running
- Wait 3-5 seconds after start before testing
- Dev logs saved to: `.logs/dev-server-8000.log`
- Stop specific port: `pnpm stop 8000`

### Quick Navigation Commands

- Find database schema: Open [lib/db/schema.ts](lib/db/schema.ts) (38 tables total)
- Find query functions: Open [lib/db/queries.ts](lib/db/queries.ts)
- Find AI configuration: Open [lib/ai/providers.ts](lib/ai/providers.ts) and [lib/ai/models.ts](lib/ai/models.ts)
- Find AI tools: Browse [lib/ai/tools/](lib/ai/tools/) directory
- Find chat API: Open [app/(chat)/api/chat/route.ts](<app/(chat)/api/chat/route.ts>)
- Find Canvas page: Open [app/(crossmind)/canvas/page.tsx](<app/(crossmind)/canvas/page.tsx>)

### Database Commands

```bash
pnpm db:migrate       # Run migrations (lib/db/migrate.ts)
pnpm db:generate      # Generate migration from schema changes
pnpm db:studio        # Open visual database editor
pnpm db:push          # Push schema directly (dev only)
pnpm db:pull          # Pull current database schema
```

### Code Quality Commands

```bash
pnpm lint             # Run Biome linter via Ultracite
pnpm format           # Auto-fix code style issues
pnpm build            # Production build (runs migrations first)
pnpm test             # Run all Playwright E2E tests
```

## Testing Instructions

### Mandatory Testing After Every Change

**Test execution order (try each until you find a working method):**

1. **Chrome DevTools MCP Testing** (preferred when available):

   ```bash
   # Check if MCP is connected
   mcp__chrome-devtools__list_pages

   # Navigate to test page
   mcp__chrome-devtools__navigate_page({ url: "http://localhost:8000/canvas" })

   # Take snapshot to verify UI state
   mcp__chrome-devtools__take_snapshot()

   # Check console for errors
   mcp__chrome-devtools__list_console_messages()

   # Verify network requests
   mcp__chrome-devtools__list_network_requests()
   ```

   **If MCP shows "Not connected"**: Report to user immediately, move to fallback methods.

2. **Server Logs Analysis** (always required):

   - Monitor real-time console output during testing
   - Verify API endpoint responses
   - Check database queries and data flow

3. **Direct Database Queries**:

   ```bash
   pnpm db:studio  # Visual inspection
   ```

4. **curl Commands for API Testing**:
   ```bash
   curl http://localhost:8000/api/health
   curl -X POST http://localhost:8000/api/canvas/nodes -H "Content-Type: application/json" -d '{"title":"Test"}'
   ```

### Test User Credentials

**CRITICAL**: Use these fixed credentials for ALL testing to avoid permission issues:

```
Email:       test@crossmind.dev
Password:    test123456
User ID:     cdfbc0e9-e288-478c-87e5-f7057591e5a1
Project ID:  6f41921c-8970-4faa-a6c0-7180af8384ee
Tier:        pro (500 health checks/month)
```

### Running Automated Tests

```bash
pnpm test                                    # All E2E tests
npx playwright test tests/e2e/chat.test.ts  # Specific test file
npx playwright test --headed                # See browser during test
npx playwright test --grep "chat"           # Match test name pattern
```

## PR Instructions

### Commit Message Format

```
feat: add new feature
fix: resolve bug in component
docs: update documentation
style: UI styling changes
refactor: restructure code
test: add or update tests
chore: build/tooling updates
```

### Git Worktree Workflow (Required for Features)

**When to use Git Worktree:**

- ✅ New feature development
- ✅ Experimental changes spanning multiple files
- ✅ Refactoring that requires isolation
- ❌ Quick bug fixes (1-2 file changes)
- ❌ Documentation-only updates

**Create worktree for new feature:**

```bash
# Format: git worktree add -b <branch-name> <directory> <base-branch>
git worktree add -b feature/your-feature-name ../crossmind-feature main

# Navigate to worktree
cd ../crossmind-feature

# Install dependencies
pnpm install

# Start dev server (will prompt for different port if 8000 is taken)
pnpm dev
```

**Branch naming conventions:**

- Features: `feature/descriptive-name`
- Bug fixes: `fix/issue-description`
- Refactoring: `refactor/component-name`
- Experiments: `exp/experiment-name`

**Development in worktree:**

```bash
# Work normally
git add .
git commit -m "feat: add feature"

# Rebase on latest main if needed
git fetch origin
git rebase origin/main
```

**Merge and cleanup:**

```bash
# Return to main workspace
cd /Users/ivan/Workspace/crossmind

# Merge feature branch
git merge feature/your-feature-name

# Remove worktree
git worktree remove ../crossmind-feature

# Delete feature branch (if merged)
git branch -d feature/your-feature-name
```

**List all worktrees:**

```bash
git worktree list
git worktree prune  # Clean stale worktrees
```

### Pre-Commit Checklist

Before every commit, verify:

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Linting passes: `pnpm lint`
- [ ] Manual testing complete (Chrome DevTools MCP or fallback methods)
- [ ] Test user credentials used for all testing
- [ ] Server logs checked for errors
- [ ] Database migrations tested (if schema changed)
- [ ] Auth routes have `export const dynamic = "force-dynamic"`

## Known Issues & Quick Fixes

### API Routes with Auth (CRITICAL)

**Issue**: Routes using `auth()` fail during Next.js 16 prerendering

**Solution**: Add `export const dynamic = "force-dynamic"` to ALL routes using `auth()`:

```typescript
import { auth } from "@/app/(auth)/auth";

export const dynamic = "force-dynamic"; // ← REQUIRED

export async function GET() {
  const session = await auth();
  // ...
}
```

**Why**: Next.js 16 attempts to prerender routes by default, but `auth()` uses `headers()` which is not allowed during prerendering.

**Verification**: Run `pnpm verify:routes` before committing.

### AI Provider Tool Calling Compatibility

**Issue**: XAI models via OpenRouter return ZodError when using Vercel AI SDK's tool calling features

**Symptoms**:
- `ZodError: Invalid input: expected string, received array`
- `Invalid option: expected one of 'completed'|'searching'|'in_progress'|'failed'`
- API returns 200 OK but fails when calling AI provider

**Root Cause**: Message format incompatibility between Vercel AI SDK and XAI models

**Solution**: Use Anthropic Claude models via OpenRouter instead:
- Current configuration: `openrouter("anthropic/claude-sonnet-4")`
- Models defined in: [lib/ai/models.ts](lib/ai/models.ts)
- Provider config: [lib/ai/providers.ts](lib/ai/providers.ts)

**Why**: Better tool calling compatibility, stable with Vercel AI SDK, supports structured outputs and reasoning middleware, single API key for multiple models

### Canvas Component Types

**Issue**: When extracting Canvas components, custom CanvasNode types cause parentId conflicts

**Reason**: Defining custom types causes conflicts (`parentId: string | null` vs `string | undefined`)

**Solution**: Always import shared `CanvasNode` type from `canvas-data.ts`:

```typescript
import type { CanvasNode } from "../canvas-data";
// NOT: type CanvasNode = { id: string; parentId: string | null; ... }
```

### Canvas Tags Format

**Issue**: Tags stored as simple strings (like `high`, `critical`) all appear in "OTHER" group in TagFilter

**Reason**: TagFilter component expects tags in `namespace/value` format (like `priority/high`, `category/design`)

**Solution**: Always use namespaced tags:

```typescript
tags: ["priority/high", "category/design", "stage/ideation"];
// NOT: ["high", "design", "ideation"]
```

**Available namespaces:**
- Priority tags: `priority/critical`, `priority/high`, `priority/medium`, `priority/low`
- Category tags: `category/design`, `category/dev`, `category/doc`, `category/research`
- Type tags: `type/feature`, `type/idea`, `type/task`, `type/bug`
- Stage tags: `stage/ideation`, `stage/validation`, `stage/implementation`, `stage/testing`

### Database Composite Keys

**Issue**: Cannot have both a separate `id` primary key and a composite primary key on the same table

**Solution**: Only keep composite primary key:

```typescript
// ✅ Correct
export const table = pgTable('table_name', {
  userId: text('user_id').notNull(),
  projectId: text('project_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.projectId] }),
}));

// ❌ Wrong
export const table = pgTable('table_name', {
  id: text('id').primaryKey(),  // Remove this
  userId: text('user_id').notNull(),
  projectId: text('project_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.projectId] }),
}));
```

### Next.js 16 API Routes Dynamic Parameters

**Issue**: Next.js 16 changed how route parameters are passed to handlers

**Old format (Next.js 15)**:

```typescript
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;  // Direct access
}
```

**New format (Next.js 16)**:

```typescript
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // Must await
}
```

**Solution**: Always `await params` in Next.js 16 route handlers

### Chrome DevTools MCP Connection

**Issue**: MCP shows "Not connected" and testing cannot proceed

**Solution**:
1. Report to user immediately - don't waste time retrying
2. Use fallback testing methods:
   - Monitor server logs during manual testing
   - Use curl commands for API testing
   - Query database directly via `pnpm db:studio`

**Important**: Testing through browser is NOT optional - it catches issues that server logs miss

### VPN Environment Build Issues

**Issue**: Next.js build fails to fetch Google Fonts with SSL certificate errors when using VPN

**Root Cause**:
- VPN routes `fonts.googleapis.com` through private DNS (198.18.0.2)
- Resolves to VPN gateway IP (198.18.0.58) instead of Google's servers
- VPN presents wrong SSL certificate (CN: upload.video.google.com)

**Symptoms**:

```
curl: (35) LibreSSL SSL_connect: SSL_ERROR_SYSCALL
Error while requesting resource: Failed to fetch Geist from Google Fonts
```

**Solution**: Configure `.env.local` to skip TLS verification (local dev only):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**Security Note**: Only use this in local development. Never deploy with this setting to production.

**Alternative Solutions**:
1. Add `fonts.googleapis.com` to VPN bypass list
2. Download fonts locally to `public/fonts/` and use local font files
3. Use system fonts as fallback

### Next.js Version Lock

**Issue**: Next.js 16 has regression bugs with `useContext` during prerendering

**Solution**: Project uses Next.js 15.3.8 with experimental build mode:

```bash
next build --experimental-build-mode=compile
```

**Build Command**: Already set in `package.json` scripts

**Related Issues**:
- [GitHub #85668](https://github.com/vercel/next.js/issues/85668) - useContext null error
- [GitHub #82366](https://github.com/vercel/next.js/issues/82366) - 404/500 prerendering

**When to upgrade**: Wait for Next.js 16.1+ stable release with fixes

## Architecture Quick Reference

### Route Structure

```
app/
├── (auth)/          # Auth routes with AuthProvider
├── (chat)/          # Chat interface with DataStreamProvider
├── (crossmind)/     # Project features (Canvas, Tasks, Memory)
└── api/             # API route handlers
```

**Layout Hierarchy**:
- Root layout: ThemeProvider, SessionProvider, Toaster
- `(chat)` and `(crossmind)` layouts add: SidebarProvider, CrossMindSidebar, DataStreamProvider

### Database Table Groups

**38 tables organized by domain** ([lib/db/schema.ts](lib/db/schema.ts)):

- **Chat**: User, Chat, Message_v2, Vote_v2, Document, Suggestion
- **Projects**: Project, Membership
- **Canvas**: CanvasNode (hierarchical, multi-type), CanvasNodeActivity, CanvasNodeComment
- **Tasks**: Task, TaskTag, TaskComment, TaskActivity
- **Agents**: AgentService, AgentOrder, AgentIdentity
- **Knowledge**: ProjectDocument (RAG storage), ChatSession

**Key JSONB Patterns**:

```typescript
// Framework-agnostic storage
positions: jsonb("positions")           // { "lean-canvas": {x,y}, "design-thinking": {x,y} }
zoneAffinities: jsonb("zoneAffinities") // { "lean-canvas": {"problem": 0.8} }
healthData: jsonb("healthData")         // Detailed health metrics
```

### Canvas System Details

**Dynamic Framework System**:
- Multiple thinking frameworks (Lean Canvas, Design Thinking, etc.)
- Zone-based positioning with AI affinity weights
- Framework-agnostic storage via JSONB

**Layout Algorithm** ([app/(crossmind)/canvas/page.tsx](app/(crossmind)/canvas/page.tsx)):

1. `getDynamicZoneConfigs()` → Calculate grid positions per framework
2. Render nodes off-screen (x: -9999) for measurement
3. `requestAnimationFrame()` → Measure actual heights
4. Calculate positions using measured heights + greedy bin packing
5. Apply final positions with CSS transforms

**Performance Optimizations**:
- Direct DOM manipulation via `transformRef` for pan/zoom
- Debounced React state sync (`syncStateDebounced`)
- Transform origin: "0 0" for consistent scaling

**Health Scoring System**:
- Levels: "critical" | "warning" | "good" | "excellent"
- Subscription limits: free (0), basic (100/month), pro (500/month)

### Key Architectural Patterns

**1. Hybrid Server/Client Pattern**:
- Server Components: Data fetching, auth, database operations
- Client Components: Interactive UI, streaming, local state
- Boundary: API routes for async; hooks for client data

**2. Tool-Based AI Interaction**:

```typescript
tools: {
  getWeather,
  createDocument: createDocument({ session, dataStream }),
  updateDocument: updateDocument({ session, dataStream }),
  requestSuggestions: requestSuggestions({ session, dataStream })
}
```

**3. Multi-Domain Entity**:
`CanvasNode` participates in multiple systems:
- Standalone document
- Task with status/assignee
- Hierarchical structure (parentId/children)
- Linked to Tasks via `CanvasNodeTask`
- Referenced in RAG via `ProjectDocument`

**4. Activity Audit Trail**:
- `CanvasNodeActivity`: Node changes
- `TaskActivity`: Task updates
- Automatic creation on mutations

### Authentication & Authorization

**NextAuth v5** ([app/(auth)/auth.ts](app/(auth)/auth.ts)):

**Providers**:
1. Regular: Email/password with bcrypt
2. Guest: Instant signup (guest-{timestamp})

**Session Extension**:

```typescript
session.user.id: string
session.user.type: "guest" | "regular"
```

**Subscription Tiers**:
- Free: 0 health checks, limited rate
- Basic: 100 health checks/month
- Pro: 500 health checks/month

**Access Control**:
- Check session in route handlers
- Row-level security via ownership checks
- Project access via `Membership` table

### Data Flow Examples

**Chat Request Flow**:

```
User Message → Save to DB → streamText()
  → Tool execution → TokenLens enrichment
  → Stream SSE → Save assistant message
  → Update chat.lastContext with usage
```

**Canvas Update Flow**:

```
Node click → setSelectedNode → Right panel
  → Edit content → API call → updateCanvasNode()
  → Create activity → SWR mutate()
  → Optimistic UI update
```

**Framework Switch Flow**:

```
Select framework → handleFrameworkChange()
  → Reset state → getDynamicZoneConfigs()
  → Measure heights → Calculate positions
  → CSS transform animation
```

### Adding New Features

**Adding Database Tables:**

1. Define table in [lib/db/schema.ts](lib/db/schema.ts) using Drizzle syntax
2. Run `pnpm db:generate` to create migration file
3. Run `pnpm db:migrate` to apply migration
4. Add query functions in [lib/db/queries.ts](lib/db/queries.ts)
5. Export TypeScript type: `export type TableName = InferSelectModel<typeof tableName>`

**Adding AI Tools:**

1. Create tool file in [lib/ai/tools/your-tool.ts](lib/ai/tools/)
2. Define tool with Zod schema for parameters
3. Register tool in [app/(chat)/api/chat/route.ts](<app/(chat)/api/chat/route.ts>) tools object
4. Update system prompts in [lib/ai/prompts.ts](lib/ai/prompts.ts) if needed

**Adding New Pages:**

1. Create in appropriate route group: `app/(crossmind)/feature/page.tsx`
2. Use Server Component for data fetching
3. Add `"use client"` directive only for interactive components
4. Follow MDL design patterns (see below)
5. Add navigation link in [components/crossmind-sidebar.tsx](components/crossmind-sidebar.tsx)

### Design System (MDL - Minimal Dense Layout)

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

**Typography hierarchy:**

```tsx
<h1 className="text-sm font-medium">Page Title</h1>  {/* NOT text-lg */}
<p className="text-sm">Content text</p>
<span className="text-xs text-muted-foreground">Meta information</span>
```

**Standard layout pattern:**

```tsx
{/* Single-line header with integrated controls */}
<div className="flex items-center gap-4 px-6 py-3 border-b">
  <Icon className="h-4 w-4" />
  <h1 className="text-sm font-medium">Title</h1>
  <Input className="flex-1 max-w-md h-8" />
  <Button variant="ghost" size="sm">Action</Button>
</div>

{/* Table-style list layout */}
<div className="divide-y divide-border/50">
  <div className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/40">
    <div className="w-24 shrink-0">{/* Fixed width category */}</div>
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

**Design Rules**:
- ✅ Use: `divide-y`, `hover:bg-muted/40`, `text-sm`, `gap-2/3/4`, `px-6`, `py-3`
- ❌ Avoid: Card borders for list items, shadows, `text-lg`, custom spacing values

**Component Development Best Practices**:
1. Use shadcn/ui primitives from [components/ui/](components/ui/)
2. Follow MDL spacing: `px-6`, `py-3`, `gap-2/3/4`
3. Use standard text sizes: `text-sm`, `text-xs`
4. Hover states: `hover:bg-muted/40`, `transition-colors`
5. Avoid custom spacing values and unnecessary decorations

### AI Integration

**Provider Configuration** ([lib/ai/providers.ts](lib/ai/providers.ts)):
- Uses `customProvider` from Vercel AI SDK
- Test mode: mock models
- Production: OpenRouter with Anthropic Claude models

**Models** (defined in [lib/ai/models.ts](lib/ai/models.ts)):
- `chat-model`: anthropic/claude-sonnet-4 (via OpenRouter)
- `chat-model-reasoning`: anthropic/claude-sonnet-4 with `<thinking>` tags
- `title-model`: anthropic/claude-sonnet-4
- `artifact-model`: anthropic/claude-sonnet-4

**Why Anthropic Claude via OpenRouter**:
- Better tool calling compatibility than XAI models
- Avoids ZodError issues with Vercel AI SDK
- Supports structured outputs and reasoning middleware
- Access via OpenRouter proxy (single API key for multiple models)

**Chat Streaming Flow** ([app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts)):

```
Request → Validation → Auth → Rate Limit
  ↓
streamText() with Tools
  ↓
Tool Execution: createDocument, updateDocument, requestSuggestions, getWeather
  ↓
TokenLens enrichment → Usage tracking → SSE stream response
```

**AI Tools** ([lib/ai/tools/](lib/ai/tools/)):
- Tools are first-class functions with Zod schemas
- Conditional availability based on model (reasoning model disables tools)

**Available AI Tools:**
- **General Chat**: `getWeather`, `createDocument`, `updateDocument`, `requestSuggestions`
- **Canvas Chat**: `createNode`, `updateNode`, `deleteNode`, `viewNode`, `updateFrameworkHealth`

**System Prompts** ([lib/ai/prompts.ts](lib/ai/prompts.ts)):
- Dynamic prompts based on model and mode
- Geolocation-aware context injection

### State Management Layers

1. **Server State**: PostgreSQL via Drizzle (single source of truth)
2. **Client Data Fetching**: SWR hooks ([hooks/use-canvas-nodes.ts](hooks/use-canvas-nodes.ts))
   - `useCanvasNodes(projectId)` - All nodes for project
   - `useCanvasNode(nodeId)` - Single node with real-time updates
3. **Streaming State**: DataStreamProvider ([components/data-stream-provider.tsx](components/data-stream-provider.tsx))
4. **Local Component State**: Direct DOM manipulation for performance (Canvas page)
5. **Session State**: NextAuth v5 with extended user types

## Environment Variables

Required in `.env.local`:

```env
AUTH_SECRET=****                    # Generate: openssl rand -base64 32
OPENROUTER_API_KEY=****            # Get from: https://openrouter.ai/
POSTGRES_URL=****                  # PostgreSQL connection string
BLOB_READ_WRITE_TOKEN=****         # Vercel Blob storage token
```

See [.env.example](.env.example) for all available environment variables.

## Observability (Langfuse)

**Integration Status**: ✅ Fully integrated and operational

CrossMind uses **Langfuse** for comprehensive AI observability tracking.

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

### Environment Setup

**Required in `.env.local`:**

```env
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_BASE_URL="https://us.cloud.langfuse.com"
```

**Getting Credentials**:
1. Sign up at https://cloud.langfuse.com
2. Create a new project
3. Copy the Secret Key, Public Key, and Base URL from Settings → API Keys
4. Add to `.env.local`

### Architecture Details

**OTEL Integration** ([instrumentation.ts](instrumentation.ts)):
- Uses OpenTelemetry with `NodeTracerProvider`
- `LangfuseSpanProcessor` for trace export
- 5-second flush interval (optimized for serverless)
- Graceful degradation when credentials missing

**Automatic Trace Creation**:

```typescript
// In chat API routes
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

**Non-Blocking Flush**:

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

### Critical Implementation Rules

**NEVER use `observe()` wrapper from `@langfuse/tracing` on route handlers**:
- ❌ Wrong: `export const POST = observe(async function handleChatRequest() {...})`
- ✅ Correct: Use only `experimental_telemetry` in `streamText()` calls
- **Reason**: `observe()` traces ALL HTTP requests, not just AI operations

**Coexistence with TokenLens**:
- **TokenLens**: Operational tracking (stored in database, shown in UI, used for billing)
- **Langfuse**: Development/debugging observability (cloud-based analytics)
- Both systems run independently and complement each other

### Viewing Traces

**Dashboard**: https://cloud.langfuse.com

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

**Filter by**:
- User ID: Search for specific users
- Function ID: `chat-stream`, `canvas-chat-stream`
- Metadata: projectId, nodeId, modelId, etc.

### Debugging Langfuse

**Check if enabled**:

```bash
# Look for startup message in dev server logs
[Langfuse] Observability enabled ✅
```

**Common Issues**:

1. **No traces appearing**:
   - Verify credentials in `.env.local`
   - Check dev server logs for errors
   - Ensure you've sent an AI chat message (not just regular HTTP request)
   - Wait 5-10 seconds for traces to appear (flush interval)

2. **Missing tool execution spans**:
   - Verify `experimental_telemetry` is enabled in `streamText()`
   - Check that tools are actually being called

3. **Performance impact**:
   - Flush happens in `after()` hook (non-blocking)
   - 5-second interval reduces overhead
   - Typical overhead: <50ms per request

### Related Files

- [instrumentation.ts](instrumentation.ts) - OTEL configuration
- [lib/observability/langfuse.ts](lib/observability/langfuse.ts) - Utility functions
- [app/(chat)/api/chat/route.ts](app/(chat)/api/chat/route.ts) - General chat telemetry
- [app/api/canvas/chat/route.ts](app/api/canvas/chat/route.ts) - Canvas chat telemetry

## Documentation

Full documentation in [docs/](docs/):

- [docs/PRD.md](docs/PRD.md) - Product requirements document
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Technical architecture hub
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) - UI/UX guidelines
- [docs/INTEGRATION_STATUS.md](docs/INTEGRATION_STATUS.md) - Implementation status tracker
- [docs/requirements/](docs/requirements/) - Business requirements (16 modules)
- [docs/architecture/](docs/architecture/) - Technical specifications (7 sections)

## Key Commands Reference

```bash
# Development
pnpm dev                    # Start dev server on port 8000
pnpm build                  # Production build (runs migrations first)
pnpm start                  # Start production server

# Database
pnpm db:migrate             # Run database migrations
pnpm db:generate            # Generate migration files
pnpm db:studio              # Open visual database editor
pnpm db:push                # Push schema directly to database (dev only)
pnpm db:pull                # Pull current database schema

# Testing & Quality
pnpm test                   # Run all Playwright E2E tests
pnpm lint                   # Run linting checks
pnpm format                 # Auto-fix code style

# Git Worktree
git worktree add -b <branch> <path> main
git worktree list
git worktree remove <path>
git worktree prune

# Dev Server Management
pnpm stop 8000              # Stop dev server on port 8000
pnpm clean:logs             # Clean all development log files
```

## Quick Debugging

### Canvas Issues

Use three-layer logging pattern:

- `[Canvas API]` - API route layer logs
- `[SWR Hook]` - Data fetching layer logs
- `[Canvas Page]` - Component layer logs

### Database Issues

```bash
pnpm db:studio              # Visual database inspection
pnpm db:pull                # Sync local schema with database
```

### AI Issues

Check Langfuse dashboard at https://cloud.langfuse.com for:

- Failed tool calls and error traces
- Token usage anomalies
- Full prompt/response logs

### Build Issues

```bash
pnpm build                                      # See full error stack
NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm build      # If VPN SSL error occurs
```

### Chrome DevTools MCP Connection Issues

If MCP shows "Not connected":

1. Report to user immediately - don't waste time retrying
2. Use fallback testing methods:
   - Monitor server logs during manual testing
   - Use curl commands for API testing
   - Query database directly via `pnpm db:studio`
