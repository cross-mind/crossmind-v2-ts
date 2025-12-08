# 技术实现

> 📖 **相关文档**：[系统架构](./02-system-architecture.md) | [数据模型](./04-data-models.md) | [API 设计](./05-api-design.md)

## 4.1 前端技术栈

### 4.1.1 核心框架

- **Next.js 15** (App Router)
  - Server Components + Client Components
  - Route Handlers (API 路由)
  - 文件系统路由

- **React 19**
  - Hooks (useState, useEffect, useMemo)
  - Server Components
  - Suspense + Streaming

### 4.1.2 UI 组件库

- **ShadCN/UI**
  - 基于 Radix UI 的无障碍组件
  - Tailwind CSS 样式系统
  - 可定制主题

- **Tailwind CSS**
  - 遵循 Minimal Dense Layout (MDL) 设计系统
  - 统一的间距、颜色、字体系统

### 4.1.3 AI 集成

- **Vercel AI SDK**
  - `@ai-sdk/react` 的 `useChat` hook
  - 流式响应处理
  - 自动重连机制

### 4.1.4 状态管理

- **React Server Components**
  - 服务端数据获取
  - 减少客户端状态

- **Zustand**（可选）
  - 客户端全局状态
  - Canvas 节点状态
  - 任务看板状态

### 4.1.5 数据获取

- **Server Components**
  - 直接访问数据库（通过 Drizzle）
  - 服务端渲染

- **React Query**（可选）
  - 客户端数据缓存
  - 乐观更新

---

## 4.2 后端技术栈

### 4.2.1 API 层

- **Next.js Route Handlers**
  - `app/api/**/route.ts`
  - 支持 GET、POST、PUT、DELETE
  - 流式响应（SSE）

- **NextAuth v5**
  - OAuth 认证（GitHub、Google）
  - Session 管理
  - 权限中间件

### 4.2.2 数据库

- **Postgres (Neon)**
  - Serverless Postgres
  - 自动扩展
  - 分支功能（开发/测试环境）

- **Drizzle ORM**
  - 类型安全的 SQL
  - 迁移管理
  - 关系查询

- **pgvector**
  - 向量存储和检索
  - 用于 RAG 检索

### 4.2.3 AI Provider 实现

**核心文件结构**：
```
src/lib/ai/
├── workspace-model.ts      # createWorkspaceModel 实现
├── workspace-manager.ts    # Workspace 容器管理
├── system-prompt.ts        # System Prompt 构建
└── rag-service.ts          # RAG 检索服务
```

**createWorkspaceModel 实现**：
```typescript
export function createWorkspaceModel(projectId: string): LanguageModelV1 {
  return {
    provider: 'crossmind-workspace',
    doStream: async (options) => {
      // 1. 加载项目上下文
      const context = await loadProjectContext(projectId);

      // 2. RAG 检索
      const relevantDocs = await ragService.retrieve(
        options.prompt,
        projectId
      );

      // 3. 构建 System Prompt
      const systemPrompt = buildSystemPrompt(context, relevantDocs);

      // 4. 获取/创建 Workspace 容器
      const container = await workspaceManager.getOrCreate(projectId);

      // 5. 转发请求到容器
      const response = await container.agentServer.stream({
        messages: options.messages,
        system: systemPrompt,
      });

      // 6. 返回流式响应
      return response;
    },
  };
}
```

### 4.2.4 Workspace Manager

**职责**：
- 容器生命周期管理（创建、查找、销毁）
- 容器健康检查
- 负载均衡（多实例场景）

**实现方式**：
- **方案 A**：Docker 容器（本地/云服务器）
- **方案 B**：Kubernetes Pod（生产环境）
- **方案 C**：Serverless 函数（Vercel Functions，受限）

**推荐方案**：Docker + Docker Compose（开发）→ Kubernetes（生产）

---

## 4.3 Workspace 容器实现

### 4.3.1 Agent Server

**技术栈**：
- Node.js 20 + Express
- HTTP/SSE 接口

**核心接口**：
```typescript
// POST /stream
interface StreamRequest {
  messages: Message[];
  system?: string;
  tools?: Tool[];
}

// GET /health
// POST /execute-tool
// GET /workspace/files
```

### 4.3.2 Claude Agent SDK 集成

**初始化**：
```typescript
import { Agent } from '@anthropic-ai/claude-agent-sdk';

const agent = new Agent({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  tools: loadMCPTools(),
  workspacePath: '/workspace',
});
```

**工具加载**：
- GitHub MCP Tool
- Notion MCP Tool
- Vercel MCP Tool
- CrossMind 自定义工具集

### 4.3.3 MCP 工具集

**CrossMind 自定义工具**：
- `save_document`：保存文档到知识库
- `update_task_status`：更新任务状态
- `create_canvas_node`：创建 Canvas 节点
- `query_project_memory`：查询项目记忆

**实现方式**：
- 遵循 MCP 协议
- 通过 HTTP 调用 CrossMind API
- 需要认证 Token（从容器环境变量获取）

---

## 4.4 RAG 检索实现

### 4.4.1 数据准备

**文档来源**：
- Canvas 节点内容
- 任务描述和评论
- Agent 生成的文档
- 对话历史摘要

**向量化**：
- 使用 OpenAI `text-embedding-3-small` 或 `claude-3-5-sonnet` 的嵌入
- 存储到 pgvector

### 4.4.2 检索流程

```typescript
async function retrieve(query: string, projectId: string) {
  // 1. 生成查询向量
  const queryVector = await embed(query);

  // 2. 向量相似度搜索
  const results = await db
    .select()
    .from(documents)
    .where(eq(documents.projectId, projectId))
    .orderBy(sql`embedding <-> ${queryVector}::vector`)
    .limit(5);

  // 3. 返回相关文档
  return results;
}
```

### 4.4.3 上下文注入

- 将检索到的文档合并到 System Prompt
- 或作为 Tool 返回（让模型决定是否使用）
