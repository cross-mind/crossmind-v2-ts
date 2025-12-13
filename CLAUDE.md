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
   - Test scripts in `scripts/` directory
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

### Setup Script
If the test user needs to be recreated or a new environment setup:
```bash
npx tsx scripts/setup-test-user.ts
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
   c. **Test scripts**:
      - Use scripts in `scripts/` directory
      - Query database directly
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
- Production: Vercel AI Gateway with XAI models

**Models**: [lib/ai/models.ts](lib/ai/models.ts)
```typescript
"chat-model": "Grok Vision" (multimodal)
"chat-model-reasoning": "Grok Reasoning" (extended thinking with <think> tags)
```

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
AI_GATEWAY_API_KEY=****            # Vercel AI Gateway key
BLOB_READ_WRITE_TOKEN=****         # Vercel Blob storage token
POSTGRES_URL=****                  # PostgreSQL connection string
REDIS_URL=****                     # Redis connection URL (optional)
```

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

## Known Issues & Solutions

### Canvas Component Type System
- **Issue**: When extracting Canvas components, must use shared `CanvasNode` type from `canvas-data.ts`
- **Reason**: Defining custom types causes conflicts (`parentId: string | null` vs `string | undefined`)
- **Solution**: Always import `type { CanvasNode } from "../canvas-data"` in Canvas components

### Canvas Data Loading with SWR
- **Issue**: useMemo + SWR 可能在 loading 期间 fallback 到 mock 数据
- **Solution**: 先检查 `isLoading` 状态再做 fallback 判断
```typescript
const data = useMemo(() => {
  if (isLoading) return []; // 加载中不要 fallback
  if (!dbData?.length) return MOCK_DATA;
  return dbData;
}, [dbData, isLoading]);
```

### Chrome DevTools MCP
- 连接断开时立即报告用户，不要重试
- 使用替代测试方法：server logs, curl, test scripts

### Next.js 16 API Routes
- 动态参数从 `{ params: { id } }` 改为 `{ params: Promise<{ id }> }`
- 需要 `const { id } = await params`

### Database Composite Keys
- 不能同时有单独的 `id` 主键和复合主键
- 只保留复合主键：`primaryKey({ columns: [table.a, table.b] })`

### Canvas Drag-Drop Animation Issue
- **Issue**: After drag-drop, nodes "fly in from left side" instead of smoothly transitioning from current position
- **Root Cause**: Data change detection was calling `setNodes([])`, causing layout algorithm to reset all positions to off-screen `{ x: -9999, y: -9999 }` for measurement
- **Solution**: Distinguish between "node add/remove" (needs full reset) vs "data only change" (preserve positions):
```typescript
// In data change detection useEffect:
if (nodesAdded || nodesRemoved) {
  setNodes([]); // Full recalculation
} else {
  // Preserve positions during data updates
  setNodes(prevNodes => prevNodes.map(prevNode => ({
    ...updatedContent,
    position: prevNode.position // Keep existing position
  })));
}
```
- **Result**: Nodes now smoothly transition via CSS `transition-all duration-300` from current position to new calculated position
- **Documentation**: See [DRAG_DROP_ANIMATION_FIX.md](DRAG_DROP_ANIMATION_FIX.md) for complete analysis

### Canvas Drag-Drop Zone Isolation Issue
- **Issue**: Dragging one node causes nodes in other zones to move unexpectedly
- **Root Cause**: Layout algorithm used unstable greedy column assignment + nodes not sorted by displayOrder
- **Problems**:
  1. `rootNodeIds` not sorted → random iteration order → unstable positions
  2. Greedy algorithm `indexOf(Math.min(...))` → column selection depends on other nodes' heights → nodes jump between columns
- **Solution**: Stable layout algorithm with two key changes:
```typescript
// 1. Sort by displayOrder before layout
const sortedRootNodeIds = rootNodeIds.sort((a, b) => {
  return (contentA?.displayOrder ?? 0) - (contentB?.displayOrder ?? 0);
});

// 2. Use round-robin column assignment (not greedy)
sortedRootNodeIds.forEach((nodeId, index) => {
  const currentColumn = index % config.columnCount; // Stable assignment
  // ...
});
```
- **Result**: Same displayOrder + same nodeHeights → same positions every time. Dragging a node only affects nodes in the same zone.
- **Trade-off**: Columns may not be perfectly balanced in height, but positions are stable and predictable
- **Documentation**: See [DRAG_DROP_ZONE_ISOLATION_FIX.md](DRAG_DROP_ZONE_ISOLATION_FIX.md) for complete analysis

### Canvas Drag-Drop Zone Stability Issue (Critical)
- **Issue**: Nodes randomly jump between zones after every drag operation, with no discernible pattern
- **Root Cause**: ALL nodes lack `zoneAffinities` data, triggering fallback logic that used unstable array index `indexOf(node)`
- **Why indexOf() is unstable**: Array order in `nodeContents` can change after SWR refetch, causing same node to get different index → different zone
- **Solution**: Use stable displayOrder-based hashing instead of array index:
```typescript
// Fallback zone assignment (when no zoneAffinities)
const displayOrder = node.displayOrder ?? 0;
const assignedZoneIndex = Math.floor(displayOrder / 10000) % zoneCount;
const fallbackZone = currentFramework.zones[assignedZoneIndex].id;
```
- **Algorithm**: Divides displayOrder space into 10000-unit segments (0-9999 → zone 0, 10000-19999 → zone 1, etc.)
- **Result**: Same displayOrder → same zone assignment, always. Small drag adjustments (±1000) stay in same zone. Only large moves (10000+) change zones.
- **Documentation**: See [DRAG_DROP_ZONE_STABILITY_FIX.md](DRAG_DROP_ZONE_STABILITY_FIX.md) for complete analysis

## Debugging

### Canvas Data Flow
- 使用三层日志系统：API → SWR → Component
- 用 `[Layer Name]` 前缀标识日志来源
- 示例：`[Canvas API]`, `[SWR Hook]`, `[Canvas Page]`

### Database Testing
- 使用 `scripts/` 目录中的测试脚本直接查询数据库
- 命名模式：`test-*.ts` 用于验证，`seed-*.ts` 用于填充测试数据
- 运行方式：`npx tsx scripts/script-name.ts`
