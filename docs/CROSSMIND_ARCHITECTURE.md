# CrossMind Architecture in chat-sdk

This document explains how CrossMind's architecture has been integrated into the chat-sdk codebase.

## System Overview

CrossMind extends chat-sdk with a complete product incubation platform that includes:

- **AI-Powered Canvas**: Visual document workspace with conversation context
- **Task Management**: Full-featured task board with AI integration
- **Development Tools**: GitHub integration and workspace management
- **Agent Marketplace**: Hire AI agents for specific tasks
- **Project Memory**: Centralized knowledge base with RAG

## Architecture Layers

### 1. Presentation Layer

**Technology**: Next.js 16 App Router + React Server Components

**Components**:
- `app/(crossmind)/` - Route group for CrossMind pages
- `components/crossmind-sidebar.tsx` - Navigation component
- `components/magicui/` - Special UI effects

**Key Patterns**:
- Server Components for data fetching
- Client Components for interactivity
- Streaming for real-time updates

### 2. API Layer

**Technology**: Next.js Route Handlers

**Endpoints**:
- `/api/projects` - Project management
- `/api/tasks` - Task CRUD operations
- `/api/agents` - Agent services and orders
- `/api/chat` (extended) - Project-aware chat

**Features**:
- NextAuth authentication
- Authorization middleware
- Type-safe with Zod validation
- Drizzle ORM for database access

### 3. Data Layer

**Technology**: Postgres (Neon) + Drizzle ORM

**Schema Extensions**:
```typescript
// Core entities
- projects: Project workspaces
- memberships: Access control
- canvas_nodes: Document nodes
- tasks: Task items
- agent_orders: AI agent executions

// Supporting tables
- task_tags: Flexible tagging
- task_comments: Collaboration
- task_activity: Audit log
- project_documents: RAG storage
- chat_sessions: Conversation history
```

**Relationships**:
```
User (from chat-sdk)
  └─> Project (owns)
       ├─> Canvas Nodes
       ├─> Tasks
       │    ├─> Task Tags
       │    ├─> Task Comments
       │    └─> Task Activity
       ├─> Agent Orders
       │    ├─> Agent Feedback
       │    └─> Agent Reviews
       ├─> Documents (for RAG)
       └─> Chat Sessions
```

### 4. AI Layer

**Technology**: Vercel AI SDK + Custom Workspace Provider

**Architecture** (from CrossMind docs):

```
┌─────────────────────────────────────┐
│  Edge/Serverless (Vercel)           │
│  - AI SDK                           │
│  - Next.js API Routes               │
│  - Custom LanguageModelV1 Provider  │
└─────────────┬───────────────────────┘
              │ HTTP/SSE
              ▼
┌─────────────────────────────────────┐
│  Workspace Container (Docker/K8s)   │
│  - Agent SDK                        │
│  - Claude Code CLI                  │
│  - MCP Tools                        │
│  - Project File System              │
└─────────────────────────────────────┘
```

**Custom Provider Flow**:
1. Load project context from database
2. Perform RAG retrieval for relevant docs
3. Build system prompt with project knowledge
4. Get or create workspace container
5. Forward request to container's agent server
6. Stream response back through AI SDK

### 5. Storage Layer

**Components**:
- **Postgres**: Structured data (projects, tasks, users)
- **Vercel Blob**: File storage (documents, exports, attachments)
- **pgvector** (optional): Vector embeddings for RAG

## Key Design Decisions

### 1. Route Groups Over Single Page App

**Original CrossMind**: Single-page React app with client-side routing

**chat-sdk Integration**: Next.js route groups

**Rationale**:
- Better SEO and performance
- Leverage server components
- Simpler data fetching
- Built-in authentication

### 2. Shared UI Components

**Approach**: Use chat-sdk's existing shadcn/ui components

**Benefits**:
- Consistent design language
- No duplicate code
- Easier maintenance
- Proven accessibility

### 3. Database-First Design

**Approach**: Extend Drizzle schema, migrate data model

**Benefits**:
- Type-safe queries
- Migration management
- Relationship enforcement
- Query optimization

### 4. Progressive Implementation

**Approach**: Scaffold structure first, implement features incrementally

**Current State**:
- ✅ Database schema
- ✅ API routes (basic CRUD)
- ✅ Page components (with mock data)
- ✅ Navigation and routing
- 🚧 Workspace containers (documented, not implemented)
- 🚧 RAG service (schema ready, not implemented)
- 🚧 Real-time features (infrastructure ready)

## Security Model

### Authentication

Uses chat-sdk's NextAuth v5 setup:
- Email/password authentication
- Guest mode support
- Session management

### Authorization

Project-level access control:
```typescript
// Check project access in API routes
const userProjects = await db
  .select()
  .from(project)
  .where(
    and(
      eq(project.id, projectId),
      eq(project.ownerId, session.user.id)
    )
  );

if (userProjects.length === 0) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}
```

Roles:
- **Owner**: Full control (from memberships table)
- **Member**: Read/write
- **Guest**: Read-only

### Data Isolation

Multi-tenancy through project scoping:
- All queries filtered by projectId
- Row-level security via Drizzle
- No cross-project data leakage

## Scalability Considerations

### Horizontal Scaling

- **Stateless API**: Can run multiple instances
- **Database**: Neon Serverless Postgres auto-scales
- **Workspace Containers**: Can be load-balanced

### Vertical Scaling

- **Edge Deployment**: Vercel's global CDN
- **Database Connection Pooling**: Through Drizzle
- **Caching**: Redis for hot data (optional)

### Performance Optimization

- **Server Components**: Reduce client bundle size
- **Incremental Static Regeneration**: Cache static content
- **Streaming**: Progressive page rendering
- **Database Indexes**: On foreign keys and common queries

## Migration Path

### Phase 1: Foundation (✅ Complete)

- Fork chat-sdk repository
- Extend database schema
- Create page scaffolds
- Set up routing

### Phase 2: Core Features (Next)

- Connect pages to real data
- Implement task management
- Build project switcher
- Add document editor

### Phase 3: AI Integration

- Implement workspace containers
- Build RAG service
- Connect chat to project context
- Deploy agent marketplace

### Phase 4: Advanced Features

- Real-time collaboration
- GitHub integration
- Analytics dashboard
- Export functionality

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Set up database
pnpm db:migrate

# Start dev server
pnpm dev
```

### Adding New Features

1. **Database**: Add table to `lib/db/schema.ts`
2. **API**: Create route in `app/api/`
3. **Page**: Add to `app/(crossmind)/`
4. **Components**: Build in `components/`
5. **Test**: Verify functionality

### Deployment

Chat-sdk is optimized for Vercel:

```bash
# Build production
pnpm build

# Deploy to Vercel
vercel deploy
```

## References

- **Original CrossMind Docs**: `/Users/ivan/Workspace/crossmind/docs/`
- **chat-sdk Docs**: https://chat-sdk.dev/
- **Vercel AI SDK**: https://sdk.vercel.ai/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Next.js**: https://nextjs.org/docs
