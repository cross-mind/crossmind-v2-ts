# 数据模型

> 📖 **相关文档**：[技术实现](./03-implementation.md) | [API 设计](./05-api-design.md) | [技术架构总览](../ARCHITECTURE.md)

## 5.1 核心表结构

### 5.1.1 用户与项目

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  workspace_container_id TEXT, -- 容器标识
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 项目成员表
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member', 'guest')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

### 5.1.2 Canvas

```sql
-- Canvas 节点表（核心是文档）
CREATE TABLE canvas_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown 文档内容
  tags TEXT[], -- 标签数组，支持 namespace:value 格式
  -- 示例：['type/idea', 'level/strategy', 'stage/design', 'priority/high']
  position_x FLOAT,
  position_y FLOAT,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canvas 节点关联任务
CREATE TABLE canvas_node_tasks (
  node_id UUID REFERENCES canvas_nodes(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (node_id, task_id)
);
```

### 5.1.3 任务中心

```sql
-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务标签表（支持 namespace）
CREATE TABLE task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  namespace TEXT, -- 如 'stage', 'risk'
  value TEXT NOT NULL, -- 如 'design', 'high'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, namespace, value)
);

-- 任务活动流表
CREATE TABLE task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id), -- 可以是用户或 agent_identity
  actor_type TEXT CHECK (actor_type IN ('user', 'agent')),
  action TEXT NOT NULL, -- 'status_changed', 'assigned', 'commented'
  old_value TEXT,
  new_value TEXT,
  metadata JSONB, -- 额外信息
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务评论表
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  author_type TEXT CHECK (author_type IN ('user', 'agent')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.1.4 Agent 雇佣中心

```sql
-- Agent 服务表
CREATE TABLE agent_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'crossmind-official'
  name TEXT NOT NULL,
  description TEXT,
  input_schema JSONB NOT NULL, -- JSON Schema 定义用户输入
  required_permissions TEXT[], -- ['github', 'stripe', 'vercel']
  output_types TEXT[], -- ['markdown', 'pdf', 'csv']
  max_iterations INTEGER DEFAULT 3,
  pricing JSONB, -- 价格信息
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 订单表
CREATE TABLE agent_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  service_id UUID REFERENCES agent_services(id),
  user_input JSONB NOT NULL, -- 用户填写的输入
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'awaiting_feedback', 'completed', 'cancelled')),
  current_iteration INTEGER DEFAULT 0,
  workspace_container_id TEXT, -- 关联的容器
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 订单反馈表
CREATE TABLE agent_order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES agent_orders(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 身份表（虚拟账号）
CREATE TABLE agent_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES agent_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 如 'CrossMind Agent · 需求调研'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent 服务评价表
CREATE TABLE agent_service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES agent_orders(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.1.5 知识库与 RAG

```sql
-- 文档表
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('canvas', 'task', 'agent', 'chat')),
  source_id UUID, -- 关联的源对象 ID
  embedding vector(1536), -- pgvector 向量
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建向量索引
CREATE INDEX documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 5.1.6 对话历史

```sql
-- 对话会话表
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  canvas_node_id UUID REFERENCES canvas_nodes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 对话消息表
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5.2 关系图

```
users
  ├── projects (owner_id)
  ├── memberships (user_id)
  └── tasks (assignee_id, created_by_id)

projects
  ├── canvas_nodes
  ├── tasks
  ├── agent_orders
  ├── documents
  └── chat_sessions

canvas_nodes
  ├── canvas_nodes (parent_id)
  └── canvas_node_tasks

tasks
  ├── task_tags
  ├── task_activity
  ├── task_comments
  └── canvas_node_tasks

agent_services
  └── agent_orders

agent_orders
  ├── agent_order_feedback
  ├── agent_identities
  └── agent_service_reviews
```
