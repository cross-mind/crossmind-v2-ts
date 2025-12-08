# CrossMind 代码库结构

> 最后更新: 2024-12-08

## 📁 项目目录结构

```
crossmind/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # 认证路由组
│   │   ├── auth.ts              # NextAuth 配置
│   │   ├── auth.config.ts       # 认证策略配置
│   │   ├── login/               # 登录页面
│   │   └── register/            # 注册页面
│   │
│   ├── (chat)/                  # AI Chat 路由组
│   │   ├── layout.tsx           # Chat 布局 (使用 CrossMindSidebar)
│   │   ├── page.tsx             # Chat 首页
│   │   ├── chat/[id]/           # 具体对话页面
│   │   └── api/                 # Chat API
│   │       ├── chat/            # 聊天流式响应
│   │       ├── document/        # 文档管理
│   │       ├── files/           # 文件上传
│   │       ├── history/         # 聊天历史
│   │       ├── suggestions/     # AI 建议
│   │       └── vote/            # 消息评分
│   │
│   ├── (crossmind)/             # CrossMind 功能路由组
│   │   ├── layout.tsx           # CrossMind 布局 (使用 CrossMindSidebar)
│   │   ├── canvas/              # Strategy Canvas
│   │   ├── tasks/               # Task Board
│   │   ├── memory/              # Project Memory
│   │   ├── dev/                 # Development Dashboard
│   │   └── agents/              # Agent Services
│   │
│   ├── api/                     # CrossMind API 路由
│   │   ├── projects/            # 项目管理 API (TODO: 实现查询)
│   │   ├── tasks/               # 任务管理 API (TODO: 实现查询)
│   │   └── agents/              # Agent 服务 API (TODO: 实现查询)
│   │
│   ├── globals.css              # 全局样式 (Linear Style Design)
│   └── layout.tsx               # 根布局
│
├── components/                   # React 组件
│   ├── crossmind-sidebar.tsx    # 统一侧边栏 (AI Chat + CrossMind)
│   ├── chat-header.tsx          # Chat 页面头部
│   ├── greeting.tsx             # 欢迎页面 (优化后)
│   ├── suggested-actions.tsx    # 建议操作 (产品开发导向)
│   ├── sidebar-toggle.tsx       # 侧边栏切换按钮
│   │
│   ├── ui/                      # shadcn/ui 组件
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── sidebar.tsx
│   │   └── ...
│   │
│   ├── elements/                # Chat 元素组件
│   │   ├── message.tsx          # 消息组件 (Linear 风格)
│   │   ├── suggestion.tsx
│   │   └── ...
│   │
│   └── magicui/                 # Magic UI 组件
│       ├── border-beam.tsx
│       ├── dot-pattern.tsx
│       └── shimmer-button.tsx
│
├── lib/                          # 工具库和配置
│   ├── ai/                      # AI 相关配置
│   │   ├── models.ts            # AI 模型配置
│   │   ├── providers.ts         # AI 提供商
│   │   ├── prompts.ts           # 提示词模板
│   │   ├── tools/               # AI 工具
│   │   └── workspace/           # Workspace Container (TODO)
│   │       ├── workspace-model.ts  # 自定义 Provider (待实现)
│   │       └── README.md
│   │
│   ├── db/                      # 数据库配置
│   │   ├── schema.ts            # Drizzle Schema (已扩展 CrossMind 表)
│   │   ├── queries.ts           # 数据库查询函数
│   │   ├── utils.ts             # 工具函数 (密码哈希等)
│   │   ├── migrate.ts           # 迁移脚本
│   │   └── migrations/          # 迁移文件
│   │
│   ├── utils.ts                 # 通用工具函数
│   ├── types.ts                 # TypeScript 类型定义
│   └── constants.ts             # 常量配置
│
├── docs/                         # 文档
│   ├── README.md                # 文档中心入口
│   ├── PRD.md                   # 产品需求文档
│   ├── ARCHITECTURE.md          # 技术架构总览
│   ├── DESIGN_SYSTEM.md         # 设计系统
│   ├── CROSSMIND_ARCHITECTURE.md # 集成架构详解
│   ├── INTEGRATION_STATUS.md    # 集成状态
│   │
│   ├── requirements/            # 业务需求
│   │   ├── 01-overview.md
│   │   └── 02-features.md
│   │
│   └── architecture/            # 技术架构细节
│       ├── 01-architecture-principles.md
│       ├── 02-system-architecture.md
│       ├── 03-implementation.md
│       ├── 04-data-models.md
│       ├── 05-api-design.md
│       ├── 06-security.md
│       └── 07-deployment.md
│
├── hooks/                        # React Hooks
│   ├── use-mobile.ts
│   ├── use-chat-visibility.ts
│   └── ...
│
├── tests/                        # 测试文件
│   ├── e2e/                     # E2E 测试
│   └── routes/                  # API 路由测试
│
├── public/                       # 静态资源
├── .env.local                    # 环境变量 (本地)
├── package.json                  # 项目依赖
├── next.config.ts                # Next.js 配置
├── drizzle.config.ts             # Drizzle 配置
└── tsconfig.json                 # TypeScript 配置
```

## 🎯 关键文件说明

### 路由结构
- `/` - AI Chat 首页 (`app/(chat)/page.tsx`)
- `/chat/[id]` - 具体对话 (`app/(chat)/chat/[id]/page.tsx`)
- `/canvas` - Strategy Canvas (`app/(crossmind)/canvas/page.tsx`)
- `/tasks` - Task Board (`app/(crossmind)/tasks/page.tsx`)
- `/memory` - Project Memory (`app/(crossmind)/memory/page.tsx`)
- `/dev` - Development (`app/(crossmind)/dev/page.tsx`)
- `/agents` - Agent Services (`app/(crossmind)/agents/page.tsx`)

### 核心组件
- `components/crossmind-sidebar.tsx` - 统一侧边栏
  - 集成 AI Chat 历史和 CrossMind 导航
  - 项目选择器 (包含应用 Logo)
  - 用户信息和设置

- `components/chat-header.tsx` - Chat 页面头部
  - 侧边栏切换按钮
  - 标题和图标
  - 可见性选择器

### 数据库 Schema
已扩展的表 (在 `lib/db/schema.ts`):
- `Project` - 项目
- `Membership` - 成员关系
- `Task` - 任务
- `CanvasNode` - Canvas 节点
- `AgentService` - Agent 服务
- `AgentOrder` - Agent 订单
- `ProjectDocument` - 项目文档

### API 路由状态
- ✅ `/api/chat` - 完全实现 (AI Chatbot 原生)
- ✅ `/api/document` - 完全实现
- ✅ `/api/files/upload` - 完全实现
- ⏳ `/api/projects` - 占位符 (TODO: 实现查询函数)
- ⏳ `/api/tasks` - 占位符 (TODO: 实现查询函数)
- ⏳ `/api/agents` - 占位符 (TODO: 实现查询函数)

## 🔧 技术栈

### 核心框架
- **Next.js 15** - App Router, Server Components, Route Handlers
- **React 19** - UI 组件
- **TypeScript** - 类型安全

### AI & 数据
- **Vercel AI SDK** - LLM 集成, 流式响应
- **Drizzle ORM** - 类型安全的数据库操作
- **PostgreSQL** - 主数据库 (Neon Serverless)

### UI & 样式
- **shadcn/ui** - UI 组件库
- **Tailwind CSS** - 样式系统
- **Framer Motion** - 动画效果
- **Lucide Icons** - 图标库

### 认证 & 安全
- **NextAuth v5** - 用户认证
- **bcrypt-ts** - 密码哈希

## 📝 代码规范

### 组件命名
- 页面组件: `XxxPage.tsx` (例如 `TaskBoardPage`)
- UI 组件: `kebab-case.tsx` (例如 `sidebar-toggle.tsx`)
- 功能组件: `PascalCase` (例如 `CrossMindSidebar`)

### 文件组织
- 页面路由: `app/(group)/page.tsx`
- API 路由: `app/api/xxx/route.ts`
- 组件: `components/xxx.tsx`
- 工具函数: `lib/xxx.ts`
- 类型定义: `lib/types.ts` 或 `lib/db/schema.ts`

### 代码风格
- 使用 `"use client"` 标记客户端组件
- API 路由使用 `export async function GET/POST`
- 数据库查询封装在 `lib/db/queries.ts`
- 类型导出使用 `InferSelectModel<typeof table>`

## 🚧 待实现功能

### 高优先级
1. **数据库查询函数** - 在 `lib/db/queries.ts` 中实现
   - `getProjectsByUserId()`
   - `createProject()`
   - `getTasksByProjectId()`
   - `createTask()`
   - `getAgentServices()`
   - `createAgentOrder()`

2. **Workspace Container** - 在 `lib/ai/workspace/` 中实现
   - `createWorkspaceModel()` - 自定义 LanguageModelV1 Provider
   - `WorkspaceManager` - 容器生命周期管理
   - RAG 检索集成

### 中优先级
3. **GitHub 集成**
   - OAuth 认证
   - 仓库自动创建
   - GitHub Actions 配置生成

4. **Canvas 交互**
   - 节点拖拽
   - 节点连接
   - 实时协作

5. **Agent 自动化**
   - Agent 委派流程
   - PR 自动提交
   - 代码审查集成

## 📚 参考文档
- [Next.js 文档](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [shadcn/ui](https://ui.shadcn.com/)
- [项目架构文档](./docs/ARCHITECTURE.md)
