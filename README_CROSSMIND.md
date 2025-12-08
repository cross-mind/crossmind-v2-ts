# CrossMind + chat-sdk Integration

This repository integrates **CrossMind** (a full-stack product incubation platform) with **chat-sdk** (Vercel's AI chatbot template).

## 🎯 What is This?

This is a **forked version of [vercel/ai-chatbot](https://github.com/vercel/ai-chatbot)** (chat-sdk) with CrossMind's product incubation features integrated:

- ✅ **AI Chat**: Full-featured chat with persistence (from chat-sdk)
- ✅ **Project Management**: Create and manage product projects
- ✅ **Task Board**: Kanban-style task management
- ✅ **Development Dashboard**: GitHub integration and workspace tools
- ✅ **Agent Services**: AI agent marketplace for specialized tasks
- ✅ **Project Memory**: Document storage and RAG-ready architecture

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL database (or use Neon)

### Installation

```bash
# Clone the repository
git clone <your-fork-url>
cd chat-sdk

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

Visit http://localhost:3000 to see the application.

## 📁 Project Structure

```
chat-sdk/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (chat)/              # Original chat-sdk chat pages
│   ├── (crossmind)/         # NEW: CrossMind feature pages
│   │   ├── tasks/           # Task board
│   │   ├── dev/             # Development dashboard
│   │   ├── agents/          # Agent marketplace
│   │   └── memory/          # Project memory
│   └── api/
│       ├── chat/            # Chat API
│       ├── projects/        # NEW: Projects API
│       ├── tasks/           # NEW: Tasks API
│       └── agents/          # NEW: Agents API
├── components/
│   ├── magicui/             # NEW: Special effects
│   ├── crossmind-sidebar.tsx # NEW: CrossMind navigation
│   └── ui/                  # Shared UI components
├── lib/
│   ├── ai/
│   │   └── workspace/       # NEW: Workspace Container integration
│   └── db/
│       └── schema.ts        # EXTENDED: Added CrossMind tables
└── docs/
    └── CROSSMIND_ARCHITECTURE.md # Architecture documentation
```

## 🎨 Features

### From chat-sdk

- ✅ AI chat with streaming responses
- ✅ User authentication (NextAuth)
- ✅ Message persistence (Postgres)
- ✅ File attachments (Vercel Blob)
- ✅ Modern UI with shadcn/ui
- ✅ Dark mode support

### From CrossMind

- ✅ **Project Workspaces**: Organize work into projects
- ✅ **Task Management**: Kanban board with status tracking
- ✅ **Document Canvas**: Visual document organization
- ✅ **Agent Marketplace**: Hire AI agents for specific tasks
- ✅ **Development Tools**: GitHub integration ready
- ✅ **RAG-Ready Architecture**: Vector storage for intelligent search

## 🏗️ Architecture

This integration follows a **hybrid architecture**:

### Frontend

- **Next.js 16** with App Router
- **React Server Components** for performance
- **Client Components** for interactivity
- **Tailwind CSS** + **shadcn/ui** for styling

### Backend

- **Next.js API Routes** for serverless functions
- **Drizzle ORM** for type-safe database access
- **PostgreSQL** for data persistence
- **Vercel AI SDK** for AI integration

### AI Layer

- **Vercel AI Gateway** for model access
- **Custom Workspace Provider** (documented, ready to implement)
- **RAG Service** (schema ready, implementation pending)

See [docs/CROSSMIND_ARCHITECTURE.md](docs/CROSSMIND_ARCHITECTURE.md) for details.

## 📚 Documentation

- **[CROSSMIND_INTEGRATION.md](CROSSMIND_INTEGRATION.md)** - Integration summary
- **[docs/CROSSMIND_ARCHITECTURE.md](docs/CROSSMIND_ARCHITECTURE.md)** - Architecture details
- **[lib/ai/workspace/README.md](lib/ai/workspace/README.md)** - Workspace Container guide
- **[chat-sdk.dev](https://chat-sdk.dev)** - Original chat-sdk documentation

## 🔧 Configuration

### Environment Variables

Required variables (from chat-sdk):

```env
# Database
DATABASE_URL=postgresql://...

# AI Gateway
AI_GATEWAY_API_KEY=your_key_here

# Blob Storage
BLOB_READ_WRITE_TOKEN=your_token_here

# Authentication
AUTH_SECRET=your_secret_here
```

Optional variables (for CrossMind features):

```env
# Workspace Containers (when implemented)
WORKSPACE_CONTAINER_URL=http://...

# GitHub Integration
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## 🗄️ Database Schema

The database schema extends chat-sdk's base tables:

**New Tables**:
- `Project` - Project workspaces
- `Membership` - Project access control
- `CanvasNode` - Document nodes
- `Task` - Task items
- `TaskTag` - Flexible tags
- `TaskComment` - Collaboration
- `TaskActivity` - Audit log
- `AgentService` - Agent catalog
- `AgentOrder` - Agent executions
- `ProjectDocument` - RAG documents
- `ChatSession` - Project-scoped chats

Run migrations to create these tables:

```bash
pnpm db:migrate
```

## 🛣️ Roadmap

### ✅ Phase 1: Foundation (Complete)

- Database schema
- Page scaffolding
- API routes
- Navigation

### 🚧 Phase 2: Core Features (In Progress)

- [ ] Connect pages to real data
- [ ] Project switcher
- [ ] Task drag-and-drop
- [ ] Document editor

### 📋 Phase 3: AI Integration (Planned)

- [ ] Workspace Container implementation
- [ ] RAG service
- [ ] Agent execution engine
- [ ] GitHub integration

### 🎯 Phase 4: Advanced Features (Future)

- [ ] Real-time collaboration
- [ ] Analytics dashboard
- [ ] Export functionality
- [ ] Mobile app

## 🤝 Contributing

This is an integration project combining:

- **[vercel/ai-chatbot](https://github.com/vercel/ai-chatbot)** - Base chat-sdk
- **CrossMind** - Product incubation features

When contributing:

1. Follow chat-sdk's coding standards
2. Use Drizzle ORM for database access
3. Implement proper authentication
4. Add TypeScript types
5. Test your changes

## 📄 License

This project inherits the license from chat-sdk (Apache 2.0).

## 🙏 Acknowledgments

- **Vercel** for chat-sdk and AI SDK
- **CrossMind** architecture and design
- **shadcn/ui** for components
- **Drizzle** for ORM

## 📞 Support

For issues related to:

- **chat-sdk features**: See [chat-sdk.dev](https://chat-sdk.dev)
- **CrossMind features**: Check [CROSSMIND_INTEGRATION.md](CROSSMIND_INTEGRATION.md)
- **General issues**: Open an issue in this repository

---

**Built with** ❤️ **using chat-sdk + CrossMind**
