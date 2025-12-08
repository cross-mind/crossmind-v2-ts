# API 设计

> 📖 **相关文档**：[数据模型](./04-data-models.md) | [安全与权限](./06-security.md) | [技术架构总览](../ARCHITECTURE.md)

## 6.1 认证

所有 API 请求需要在 Header 中携带认证 Token：

```
Authorization: Bearer <token>
```

Token 通过 NextAuth v5 的 Session 获取。

---

## 6.2 Chat API

### `POST /api/chat`

统一 AI 会话入口。

**请求体**：
```typescript
{
  projectId: string;
  message: string;
  canvasNodeId?: string; // 可选，如果从 Canvas 节点发起
  sessionId?: string; // 可选，继续已有会话
}
```

**响应**：SSE 流
```
data: {"type": "text-delta", "content": "..."}
data: {"type": "text-delta", "content": "..."}
data: {"type": "done"}
```

**实现**：
```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { projectId, message, canvasNodeId } = await req.json();

  // 1. 验证权限
  const session = await getServerSession();
  await checkProjectAccess(session.user.id, projectId);

  // 2. 创建 AI Provider
  const model = createWorkspaceModel(projectId);

  // 3. 流式响应
  return streamText({
    model,
    messages: [{ role: 'user', content: message }],
    system: await buildSystemPrompt(projectId, canvasNodeId),
  });
}
```

---

## 6.3 Canvas API

### `GET /api/projects/:projectId/canvas`

获取项目的 Canvas 数据。

**响应**：
```typescript
{
  nodes: CanvasNode[];
  edges: CanvasEdge[]; // 节点间的连接关系
}
```

### `POST /api/projects/:projectId/canvas/nodes`

创建 Canvas 节点（文档）。

**请求体**：
```typescript
{
  title: string;
  content: string; // Markdown 文档内容
  tags?: string[]; // 标签数组，支持 namespace:value 格式
  // 示例：['type/idea', 'level/strategy', 'stage/design']
  positionX?: number;
  positionY?: number;
  status?: 'not_started' | 'in_progress' | 'blocked' | 'completed';
}
```

### `PUT /api/projects/:projectId/canvas/nodes/:nodeId`

更新 Canvas 节点。

### `DELETE /api/projects/:projectId/canvas/nodes/:nodeId`

删除 Canvas 节点。

---

## 6.4 Tasks API

### `GET /api/projects/:projectId/tasks`

获取任务列表。

**查询参数**：
- `status`: 过滤状态
- `assigneeId`: 过滤负责人
- `tag`: 过滤标签（支持 namespace:value）
- `view`: `kanban` | `list`

**响应**：
```typescript
{
  tasks: Task[];
  groups?: TaskGroup[]; // Kanban 视图的分组
}
```

### `POST /api/projects/:projectId/tasks`

创建任务。

**请求体**：
```typescript
{
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'blocked' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  tags?: Array<{ namespace?: string; value: string }>;
  dueDate?: string;
}
```

### `PUT /api/projects/:projectId/tasks/:taskId`

更新任务。

### `POST /api/projects/:projectId/tasks/:taskId/comments`

添加任务评论。

---

## 6.5 Agent Services API

### `GET /api/agent-services`

获取 Agent 服务列表。

**响应**：
```typescript
{
  services: AgentService[];
}
```

### `GET /api/agent-services/:serviceId`

获取服务详情。

### `POST /api/agent-services/:serviceId/orders`

创建 Agent 订单。

**请求体**：
```typescript
{
  projectId: string;
  userInput: Record<string, any>; // 根据服务的 input_schema 验证
  permissions: {
    github?: { repo: string; token: string };
    stripe?: { apiKey: string };
    vercel?: { token: string };
  };
}
```

**响应**：
```typescript
{
  orderId: string;
  taskId: string; // 自动创建的任务 ID
}
```

### `POST /api/agent-orders/:orderId/feedback`

提交反馈。

**请求体**：
```typescript
{
  feedbackText: string;
}
```
