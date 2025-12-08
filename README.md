# CrossMind AI Platform

<div align="center">

![CrossMind Logo](https://img.shields.io/badge/CrossMind-AI%20Platform-blue?style=for-the-badge)

**An integrated product development platform powered by AI**

[![GitHub](https://img.shields.io/badge/GitHub-cross--mind%2Fcrossmind--v2--ts-181717?style=flat&logo=github)](https://github.com/cross-mind/crossmind-v2-ts)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat)](./LICENSE)

[🌐 Live Demo](#) · [📖 Documentation](./docs/README.md) · [🐛 Report Bug](https://github.com/cross-mind/crossmind-v2-ts/issues) · [✨ Request Feature](https://github.com/cross-mind/crossmind-v2-ts/issues)

</div>

---

## 🚀 Overview

CrossMind is a comprehensive AI-powered product development platform that integrates ideation, documentation, task management, and agent services into a unified workflow. Built on top of [Vercel's AI Chatbot](https://github.com/vercel/ai-chatbot), CrossMind extends AI capabilities with specialized tools for product teams.

### ✨ Key Features

- 🤖 **AI Chat Assistant** - Intelligent conversational AI for product development guidance
- 🎨 **Strategy Canvas** - Visual workspace for ideation and strategic planning
- 📋 **Task Board** - Kanban-style task management with AI-powered breakdown
- 🧠 **Project Memory** - Context-aware knowledge base for project history
- 💻 **Development Dashboard** - GitHub integration and development workflows
- 🎯 **Agent Services** - Marketplace for AI agents to automate tasks

## 🎯 Core Capabilities

```
Idea → Strategy → Tasks → Development → Deployment
  ↓        ↓         ↓          ↓            ↓
Canvas   Memory    Board      GitHub      Agents
```

## 🏗️ Architecture

CrossMind follows a **five-layer architecture**:

1. **Client Layer** - Next.js 15 + React 19 with shadcn/ui
2. **API Gateway** - Next.js Route Handlers
3. **AI Layer** - Vercel AI SDK with multiple LLM providers
4. **Workspace Container** - Isolated execution environment (planned)
5. **Data Persistence** - PostgreSQL with Drizzle ORM

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 🛠️ Tech Stack

### Core Framework
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org)** - Type-safe development
- **[React 19](https://react.dev)** - UI library with Server Components

### AI & Backend
- **[Vercel AI SDK](https://sdk.vercel.ai)** - Unified AI interface
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database toolkit
- **[PostgreSQL](https://www.postgresql.org)** - Production database
- **[NextAuth v5](https://authjs.dev)** - Authentication

### UI & Styling
- **[shadcn/ui](https://ui.shadcn.com)** - Component library
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS
- **[Framer Motion](https://www.framer.com/motion)** - Animations
- **[Lucide Icons](https://lucide.dev)** - Icon system

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (local or Neon)
- OpenAI API key (or other LLM provider)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/cross-mind/crossmind-v2-ts.git
cd crossmind-v2-ts
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# Authentication
AUTH_SECRET=your_random_secret_here

# Database (PostgreSQL)
POSTGRES_URL=postgresql://user:password@host:5432/database

# AI Provider (OpenAI, Anthropic, etc.)
OPENAI_API_KEY=your_openai_key_here
```

4. **Run database migrations**
```bash
pnpm db:migrate
```

5. **Start development server**
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📁 Project Structure

```
crossmind-v2-ts/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   ├── (chat)/              # AI Chat pages
│   ├── (crossmind)/         # CrossMind feature pages
│   └── api/                 # API routes
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── elements/            # Chat UI elements
│   └── crossmind-sidebar.tsx
├── lib/                     # Utilities and configs
│   ├── ai/                  # AI SDK configuration
│   ├── db/                  # Database schema & queries
│   └── utils.ts
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   └── architecture/
└── public/                  # Static assets
```

For detailed structure, see [CODEBASE_STRUCTURE.md](./CODEBASE_STRUCTURE.md).

## 📖 Documentation

- **[Product Requirements](./docs/PRD.md)** - Features and user stories
- **[Architecture Design](./docs/ARCHITECTURE.md)** - Technical architecture
- **[Design System](./docs/DESIGN_SYSTEM.md)** - UI/UX guidelines
- **[Integration Status](./docs/INTEGRATION_STATUS.md)** - Current implementation status
- **[API Design](./docs/architecture/05-api-design.md)** - API specifications

## 🧪 Development

### Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format with Biome

# Testing
pnpm test             # Run tests
pnpm test:e2e         # Run E2E tests
```

### Design System

CrossMind uses a **Linear-inspired design system**:

- **Color Space**: OKLCH for perceptually uniform colors
- **Background**: Pure white (`oklch(1 0 0)`)
- **Typography**: System fonts with tight tracking
- **Border Radius**: Compact (0.3rem)
- **Information Density**: High, table-style layouts

See [DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) for details.

## 🗺️ Roadmap

### ✅ Completed (v0.1)
- [x] AI Chat integration
- [x] Unified sidebar navigation
- [x] 6 core pages (Chat, Canvas, Tasks, Memory, Dev, Agents)
- [x] Linear style design system
- [x] Database schema with CrossMind tables
- [x] NextAuth v5 authentication

### 🚧 In Progress (v0.2)
- [ ] Implement database query functions
- [ ] Connect UI to backend APIs
- [ ] Workspace Container architecture
- [ ] GitHub OAuth integration

### 📅 Planned (v0.3+)
- [ ] Canvas node drag & drop
- [ ] Real-time collaboration
- [ ] Agent automation workflows
- [ ] Code generation with PR auto-submit

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot) - Foundation template
- [shadcn/ui](https://ui.shadcn.com) - Component library
- [Vercel AI SDK](https://sdk.vercel.ai) - AI integration
- [Linear](https://linear.app) - Design inspiration

## 📮 Contact

- **GitHub**: [@cross-mind](https://github.com/cross-mind)
- **Issues**: [Report a bug](https://github.com/cross-mind/crossmind-v2-ts/issues)
- **Discussions**: [Join the conversation](https://github.com/cross-mind/crossmind-v2-ts/discussions)

---

<div align="center">

**Built with ❤️ using Next.js and Vercel AI SDK**

[⭐ Star on GitHub](https://github.com/cross-mind/crossmind-v2-ts) · [🐛 Report Issue](https://github.com/cross-mind/crossmind-v2-ts/issues)

</div>
