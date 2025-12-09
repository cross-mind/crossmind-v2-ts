/**
 * Mock Canvas Data for CrossMind Demo
 *
 * Based on real CrossMind project requirements
 * Demonstrates large-scale project with node references and cross-linking
 */

export interface CanvasNode {
  id: string;
  title: string;
  type: "document" | "idea" | "task" | "agent";
  position: { x: number; y: number };
  content: string;
  tags: string[];
  parentId?: string;
  children?: string[];
  // Task-specific fields
  taskStatus?: "todo" | "in-progress" | "done";
  assignee?: string;
  dueDate?: string;
  // Agent-specific fields
  agentName?: string;
  generatedAt?: string;
  // References to other nodes
  references?: string[]; // Array of node IDs that this node references
}

export interface FeedActivity {
  id: string;
  type: "created" | "updated" | "status_changed" | "tag_added" | "comment_added" | "agent_completed";
  user: string;
  timestamp: string;
  description: string;
  details?: string;
}

export interface Comment {
  id: string;
  user: string;
  avatar?: string;
  content: string;
  timestamp: string;
  mentions?: string[];
}

export interface AISuggestion {
  id: string;
  type: "add-node" | "add-tag" | "refine-content";
  title: string;
  description: string;
}

// Strategic zones positioning - Optimized for better screen utilization
// Zone widths: Ideation (0-500), Design (550-1050), Development (1100-1600), Launch (1650-2150)
// Node width: 320px, center positions: 90, 640, 1190, 1740
// Vertical spacing: 180px (reduced from 280-320px for better density)
// Child indent: 20px horizontal offset

export const MOCK_NODES: CanvasNode[] = [
  // ============================================
  // IDEATION ZONE (0-500) - Ideas & Research
  // ============================================

  // 1. Product Vision (Root node)
  {
    id: "vision-1",
    title: "CrossMind 产品愿景",
    type: "document",
    position: { x: 90, y: 60 },
    content: `# CrossMind 产品愿景

## 核心理念
从想法到产品，用 AI 加速小团队的创造力。

## 目标用户
- Indie Hackers
- 3-10 人小团队
- 技术型创业者

## 产品定位
轻量级项目管理工具 + AI 能力增强

## 差异化优势
1. Canvas 可视化组织想法
2. AI Agent 雇佣中心
3. 完整的知识积累

参考文档：
- [[prd-1]] 产品需求文档
- [[personas-1]] 用户画像
- [[journey-1]] 用户旅程设计`,
    tags: ["stage/ideation", "type/vision", "priority/critical"],
    children: ["prd-1", "market-research-1", "competitor-1"],
    references: ["prd-1", "personas-1", "journey-1"],
  },

  // 2. Market Research (Child of vision)
  {
    id: "market-research-1",
    title: "市场调研报告",
    type: "agent",
    position: { x: 110, y: 240 },
    content: `# 市场调研报告

🤖 由 Reddit 调研 Agent 生成 | 2024-12-08

## 调研范围
- Reddit r/SaaS, r/indiehackers, r/Entrepreneur
- Product Hunt 评论分析
- 竞品用户反馈

## 核心发现

### 用户痛点
1. **工具过于复杂**（提及 156 次）
   - Jira/Asana 对小团队过重
   - 学习曲线陡峭

2. **缺乏 AI 辅助**（提及 89 次）
   - 手动整理文档耗时
   - 没有智能建议

3. **知识散落各处**（提及 73 次）
   - Notion + Slack + GitHub 切换频繁
   - 找不到历史决策记录

### 机会点
- 可视化组织想法（Canvas）
- AI 辅助决策和内容生成
- 一站式知识管理

参考：
- [[vision-1]] 产品愿景
- [[personas-1]] 用户画像`,
    tags: ["stage/research", "type/research"],
    parentId: "vision-1",
    agentName: "Reddit 调研 Agent",
    generatedAt: "2024-12-08 15:30",
    references: ["vision-1", "personas-1"],
  },

  // 3. Competitor Analysis
  {
    id: "competitor-1",
    title: "竞品分析",
    type: "document",
    position: { x: 110, y: 720 },
    content: `# 竞品分析

## Notion
✅ 优点：灵活的文档结构
❌ 缺点：缺乏可视化、没有 AI 工作流

## Miro/FigJam
✅ 优点：强大的 Canvas 能力
❌ 缺点：只能可视化，无法执行

## Linear
✅ 优点：现代化的任务管理
❌ 缺点：面向工程师，非技术用户门槛高

## CrossMind 差异化
1. Canvas + 任务中心双模式
2. AI Agent 雇佣中心（独特）
3. 自动知识积累

参考：
- [[vision-1]] 产品愿景
- [[feature-canvas]] Canvas 功能设计`,
    tags: ["stage/research", "type/analysis"],
    parentId: "vision-1",
    references: ["vision-1", "feature-canvas"],
  },

  // 4. User Personas
  {
    id: "personas-1",
    title: "用户画像",
    type: "document",
    position: { x: 90, y: 1040 },
    content: `# 用户画像

## Sarah - Indie Hacker
- 独立开发者，同时负责产品、设计、开发
- 痛点：想法多但无法系统化管理
- 目标：快速验证 MVP

## Alex - 技术创业者
- 3 人小团队 CTO
- 痛点：团队协作工具过于复杂
- 目标：轻量级但专业的项目管理

## TechBros - 小团队
- 5-8 人远程团队
- 痛点：知识散落、决策过程不透明
- 目标：一站式协作平台

参考：
- [[vision-1]] 产品愿景
- [[journey-1]] 用户旅程`,
    tags: ["stage/ideation", "type/doc"],
    references: ["vision-1", "journey-1"],
  },

  // 5. User Journey
  {
    id: "journey-1",
    title: "用户旅程设计",
    type: "document",
    position: { x: 90, y: 1360 },
    content: `# 用户旅程设计

## 场景 1: 想法孵化
Sarah 有一个 SaaS 想法 → 在 Canvas 创建节点 → AI 建议市场调研 → 雇佣调研 Agent → 完善想法

## 场景 2: 团队协作
Alex 分配任务 → 成员评论讨论 → Agent 自动更新进度 → 查看活动流

## 场景 3: 知识沉淀
TechBros 完成项目 → 所有文档自动归档 → 周报生成 → RAG 搜索历史决策

参考：
- [[personas-1]] 用户画像
- [[onboarding-1]] 新手引导设计`,
    tags: ["stage/ideation", "type/doc"],
    references: ["personas-1", "onboarding-1"],
  },

  // 6-10. Feature Ideas
  {
    id: "idea-github",
    title: "💡 集成 GitHub Issues",
    type: "idea",
    position: { x: 90, y: 1680 },
    content: `💡 是否支持直接同步 GitHub Issues 到任务看板？

优点：
- 开发者熟悉的工作流
- 减少工具切换

疑问：
- 会增加复杂度吗？
- MVP 阶段是否必要？

相关讨论：
- [[feature-task]] 任务管理功能设计`,
    tags: ["stage/ideation", "type/idea", "priority/medium"],
    references: ["feature-task"],
  },

  {
    id: "idea-mobile",
    title: "💡 移动端支持",
    type: "idea",
    position: { x: 90, y: 1920 },
    content: `💡 是否需要原生移动应用？

用户场景：
- 通勤时查看任务进度
- 快速回复评论
- Agent 完成通知

技术选型考虑：
- PWA vs React Native
- 功能子集还是完整功能？

参考：
- [[prd-1]] PRD 非功能需求`,
    tags: ["stage/ideation", "type/idea", "priority/low"],
    references: ["prd-1"],
  },

  {
    id: "idea-templates",
    title: "💡 行业模板库",
    type: "idea",
    position: { x: 90, y: 2160 },
    content: `💡 提供预设的行业模板（BMC、PRD、技术架构等）

价值：
- 降低新用户门槛
- 最佳实践传播

模板类型：
- SaaS 产品开发模板
- 内容创作模板
- 个人项目管理模板

参考：
- [[feature-canvas-ai]] Canvas AI 增强`,
    tags: ["stage/ideation", "type/idea", "priority/medium"],
    references: ["feature-canvas-ai"],
  },

  // ============================================
  // DESIGN ZONE (550-1050)
  // ============================================

  // 11. PRD
  {
    id: "prd-1",
    title: "产品需求文档 (PRD)",
    type: "document",
    position: { x: 640, y: 80 },
    content: `# CrossMind 产品需求文档

## 1. 产品概述
参考：[[vision-1]] 产品愿景

## 2. 功能模块

### 2.1 Canvas 画布
参考：[[feature-canvas]] Canvas 核心功能

### 2.2 任务中心
参考：[[feature-task]] 任务管理

### 2.3 Agent 雇佣中心
参考：[[feature-agent]] Agent 雇佣中心

## 3. 用户体验
参考：[[journey-1]] 用户旅程

## 4. 验收标准
- 新用户 5 分钟上手
- Canvas 操作延迟 < 100ms
- Agent 响应时间 < 2 分钟`,
    tags: ["stage/design", "type/doc", "priority/critical"],
    children: ["feature-canvas", "feature-task", "feature-agent"],
    references: ["vision-1", "feature-canvas", "feature-task", "feature-agent", "journey-1"],
  },

  // 12. Canvas Core Features
  {
    id: "feature-canvas",
    title: "Canvas 核心功能设计",
    type: "document",
    position: { x: 660, y: 400 },
    content: `# Canvas 核心功能设计

## 1. 节点管理
### 1.1 节点类型
- 📄 Document：正式文档
- 💡 Idea：未验证的想法
- ☑️ Task：可执行任务
- 🤖 Agent：AI 生成内容

### 1.2 节点操作
- 创建、编辑、删除
- 拖拽移动
- 层级管理（最多 5 层）

## 2. 画布操作
- 缩放：Cmd+滚轮
- 平移：默认滚轮或拖拽
- 框选：批量操作

## 3. 战略分区
- 💡 Ideation（想法验证）
- 📋 Design（设计阶段）
- ⚙️ Development（开发执行）
- 🚀 Launch（上线运营）

## 4. 节点引用
支持 [[node-id]] 语法引用其他节点，点击可跳转

参考：
- [[prd-1]] PRD
- [[feature-canvas-ai]] Canvas AI 增强
- [[design-system]] 设计系统`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-canvas-ai"],
    references: ["prd-1", "feature-canvas-ai", "design-system"],
  },

  // 13. Canvas AI Enhancement
  {
    id: "feature-canvas-ai",
    title: "Canvas AI 增强",
    type: "document",
    position: { x: 680, y: 720 },
    content: `# Canvas AI 增强

## 1. AI 对话面板
- 右侧滑入式面板
- 流式输出
- 自动附加当前文档为上下文

## 2. 智能建议
扫描 Canvas 节点，提供：
- 缺失模块提示
- 自动拆解大节点
- 关系推理（推荐连线）

## 3. 预设模板
- Business Model Canvas
- OKR 框架
- 精益画布
- 产品战略图

## 4. MCP 工具调用
AI 可直接操作 Canvas：
- create_canvas_node
- update_canvas_node
- create_connection

参考：
- [[feature-canvas]] Canvas 核心
- [[ai-integration]] AI 能力集成`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "feature-canvas",
    references: ["feature-canvas", "ai-integration"],
  },

  // 14. Task Management
  {
    id: "feature-task",
    title: "任务管理功能设计",
    type: "document",
    position: { x: 660, y: 1040 },
    content: `# 任务管理功能设计

## 1. 任务字段
- 标题、描述
- 状态：Todo / In Progress / Review / Done / Blocked
- 优先级：Critical / High / Medium / Low
- 负责人、截止日期
- 标签、验收标准

## 2. 视图模式
### 看板视图
按状态分列，拖拽更新状态

### 列表视图
- 多维过滤（状态、优先级、负责人、标签）
- 排序、分组
- 批量操作

## 3. 任务关系
- 子任务（最多 3 层）
- 依赖关系（A 完成后才能开始 B）
- 关联 Canvas 节点

## 4. 活动流 & 评论
参考：[[feature-task-collab]] 任务协作功能

参考文档：
- [[prd-1]] PRD
- [[feature-task-collab]] 任务协作
- [[data-model-task]] 任务数据模型`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-task-collab"],
    references: ["prd-1", "feature-task-collab", "data-model-task"],
  },

  // 15. Task Collaboration
  {
    id: "feature-task-collab",
    title: "任务协作功能设计",
    type: "document",
    position: { x: 680, y: 1360 },
    content: `# 任务协作功能设计

## 1. 活动流（Activity Feed）
记录所有操作：
- 状态变更
- 字段修改
- Agent 自动更新
- 评论添加

## 2. 评论系统
- @ 提醒功能
- Markdown 支持
- 嵌入 AI 回复

## 3. 多用户协作
### 角色系统
- Owner：完全权限
- Member：编辑权限
- Guest：只读 + 评论

### 权限控制
- 谁能创建/删除任务
- 谁能触发 Agent
- 谁能修改验收标准

## 4. 实时同步
参考：[[realtime-collab]] 实时协作设计

参考文档：
- [[feature-task]] 任务管理核心
- [[notification]] 通知系统`,
    tags: ["stage/design", "type/doc", "priority/medium"],
    parentId: "feature-task",
    references: ["feature-task", "realtime-collab", "notification"],
  },

  // 16. Agent Marketplace
  {
    id: "feature-agent",
    title: "Agent 雇佣中心设计",
    type: "document",
    position: { x: 660, y: 1680 },
    content: `# Agent 雇佣中心设计

## 1. 服务分类

### 想法验证阶段
- Reddit 市场调研
- Product Hunt 竞品分析
- 用户访谈脚本生成

### 设计阶段
- 头脑风暴助手
- PRD 文档生成
- Landing Page 文案

### 开发阶段
- 代码生成（React 组件）
- 技术选型建议
- 测试用例生成

### 运营阶段
- 营销文案创作
- 社交媒体内容
- 数据分析报告

## 2. 下单流程
1. 选择服务
2. 填写输入表单（关键词、时间范围等）
3. 授权管理（GitHub/Notion/Stripe 等）
4. 确认订单和支付
5. Agent 开始执行

## 3. 定价模型
- 基础迭代次数：3-7 次
- 超出后按次付费
- 首次体验免费

参考：
- [[prd-1]] PRD
- [[feature-agent-exec]] Agent 执行与反馈`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-agent-exec"],
    references: ["prd-1", "feature-agent-exec"],
  },

  // 17. Agent Execution
  {
    id: "feature-agent-exec",
    title: "Agent 执行与反馈设计",
    type: "document",
    position: { x: 680, y: 2000 },
    content: `# Agent 执行与反馈设计

## 1. Agent 临时账号
- 虚拟成员身份
- 权限范围限制（只能操作指定任务/节点）
- 仅在项目内活动

## 2. 任务执行追踪
- 在任务中心生成跟踪任务
- 进度实时更新（10% → 50% → 100%）
- 中间产物展示

## 3. 进度通知
- Agent 开始工作（弹窗）
- 完成第一版产出（弹窗 + 邮件）
- 需要用户反馈（弹窗）

## 4. 反馈与迭代
- 用户提供反馈
- Agent 迭代更新
- 迭代次数显示："还剩 X 次免费迭代"
- 超出后付费

## 5. 完成与评价
- 用户标记完成
- 匿名评价（1-5 星 + 文字）

参考：
- [[feature-agent]] Agent 雇佣中心
- [[notification]] 通知系统`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "feature-agent",
    references: ["feature-agent", "notification"],
  },

  // 18. Tagging System
  {
    id: "feature-tagging",
    title: "标签系统设计",
    type: "document",
    position: { x: 640, y: 2320 },
    content: `# 标签系统设计

## 1. Namespace 体系
\`\`\`
type/*      类型标签 (idea/research/prototype/bug/feature/doc)
level/*     层次标签 (strategy/module/task)
stage/*     阶段标签 (research/design/dev/launch)
priority/*  优先级标签 (critical/high/medium/low)
risk/*      风险标签 (high/blocked)
skill/*     技能标签 (design/frontend/backend/marketing)
integration/* 集成标签 (github/stripe/vercel)
\`\`\`

## 2. 标签操作
- 创建标签（预设 vs 自定义）
- 标签自动补全
- 标签编辑和删除
- 标签合并

## 3. 过滤与搜索
- 单标签过滤
- 多标签组合（AND/OR）
- 按 namespace 分组

## 4. Canvas 和 Task 共享标签池

参考：
- [[feature-canvas]] Canvas 核心
- [[feature-task]] 任务管理`,
    tags: ["stage/design", "type/doc", "priority/medium"],
    references: ["feature-canvas", "feature-task"],
  },

  // 19-22. Design Specs
  {
    id: "design-system",
    title: "设计系统",
    type: "document",
    position: { x: 640, y: 2640 },
    content: `# 设计系统

## 设计原则
1. 简洁至上 - 去除一切不必要的元素
2. 快速反馈 - 所有操作 < 100ms 响应
3. AI 融入 - 自然的 AI 辅助体验

## 色彩系统
- 主色：科技蓝 #3B82F6
- 辅助色：渐变紫 #8B5CF6
- 节点类型色：
  - Document: 蓝色
  - Idea: 黄色
  - Task: 绿色
  - Agent: 紫色

## 组件库
参考 shadcn/ui

参考：
- [[feature-canvas]] Canvas 设计
- [[ui-components]] UI 组件库`,
    tags: ["stage/design", "type/doc"],
    references: ["feature-canvas", "ui-components"],
  },

  {
    id: "onboarding-1",
    title: "新手引导设计",
    type: "document",
    position: { x: 640, y: 2960 },
    content: `# 新手引导设计

## 1. 欢迎流程
- 登录后欢迎页
- 快速介绍（30 秒）
- 选择："从示例开始" 或 "创建空白项目"

## 2. 示例数据
预填充：
- Canvas：2-3 个示例节点
- 任务：1-2 个示例任务
- Agent 产出：1 个完成的调研报告

## 3. 分步引导（3 步）
1. 查看 Canvas 示例节点
2. 雇佣第一个 Agent（免费）
3. 创建任务追踪进度

## 4. 完成庆祝
庆祝动画 🎉 "你已掌握 CrossMind 核心流程！"

参考：
- [[journey-1]] 用户旅程
- 详细设计文档：docs/requirements/modules/16-onboarding.md`,
    tags: ["stage/design", "type/doc", "priority/high"],
    references: ["journey-1"],
  },

  // ============================================
  // DEVELOPMENT ZONE (1100-1600)
  // ============================================

  // 23. Technical Architecture
  {
    id: "arch-1",
    title: "技术架构设计",
    type: "document",
    position: { x: 1190, y: 80 },
    content: `# 技术架构设计

## 1. 五层架构模型
1. 展示层（Next.js + React）
2. 业务逻辑层（Server Actions）
3. AI 能力层（Anthropic Claude）
4. 数据持久层（Supabase）
5. 基础设施层（Vercel + Edge Network）

## 2. 前端技术栈
- Next.js 14 (App Router)
- React Server Components
- Tailwind CSS + shadcn/ui
- Zustand (状态管理)

## 3. 后端技术栈
- Supabase (PostgreSQL + Auth + Realtime)
- Drizzle ORM
- Server Actions

## 4. AI 集成
- Anthropic Claude Sonnet 4.5
- MCP (Model Context Protocol)
- RAG (向量检索)

参考：
- [[arch-frontend]] 前端架构
- [[arch-backend]] 后端架构
- [[data-models]] 数据模型
- 详细文档：docs/ARCHITECTURE.md`,
    tags: ["stage/dev", "type/doc", "priority/critical"],
    children: ["arch-frontend", "arch-backend", "data-models"],
    references: ["arch-frontend", "arch-backend", "data-models"],
  },

  // 24. Frontend Architecture
  {
    id: "arch-frontend",
    title: "前端架构设计",
    type: "document",
    position: { x: 1210, y: 400 },
    content: `# 前端架构设计

## 1. 目录结构
\`\`\`
app/
├── (crossmind)/
│   ├── canvas/          Canvas 页面
│   ├── tasks/           任务中心
│   └── agents/          Agent 雇佣中心
components/              可复用组件
hooks/                   自定义 Hooks
lib/                     工具函数
\`\`\`

## 2. 状态管理
- Zustand：全局状态（Canvas 节点、任务列表）
- React Server Components：服务端状态
- URL State：路由状态

## 3. 性能优化
- React Server Components（减少客户端 JS）
- 懒加载（Canvas 节点、Markdown 渲染）
- 虚拟滚动（任务列表）

## 4. 实时同步
- Supabase Realtime（WebSocket）
- 乐观更新

参考：
- [[arch-1]] 技术架构总览
- [[task-canvas-impl]] Canvas 实现任务`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    parentId: "arch-1",
    references: ["arch-1", "task-canvas-impl"],
  },

  // 25. Backend Architecture
  {
    id: "arch-backend",
    title: "后端架构设计",
    type: "document",
    position: { x: 1210, y: 720 },
    content: `# 后端架构设计

## 1. 数据库（Supabase PostgreSQL）
参考：[[data-models]] 数据模型设计

## 2. 认证授权
- Supabase Auth（OAuth GitHub/Google）
- Row Level Security (RLS)

## 3. API 层
- Server Actions（主要）
- REST API（少量）
- GraphQL（未来考虑）

## 4. AI 集成
### Anthropic Claude API
- 对话生成
- 内容分析
- MCP 工具调用

### RAG 系统
- 向量数据库：Supabase pgvector
- Embeddings：OpenAI text-embedding-3-small

参考：
- [[arch-1]] 技术架构总览
- [[ai-integration]] AI 能力集成`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    parentId: "arch-1",
    references: ["arch-1", "ai-integration", "data-models"],
  },

  // 26. Data Models
  {
    id: "data-models",
    title: "数据模型设计",
    type: "document",
    position: { x: 1210, y: 1040 },
    content: `# 数据模型设计

## 1. 核心表

### workspaces（工作空间）
- id, name, slug, owner_id
- created_at, updated_at

### canvas_nodes（Canvas 节点）
- id, workspace_id, title, type
- content (JSONB)
- position (JSONB)
- parent_id, tags

### tasks（任务）
- id, workspace_id, title, description
- status, priority, assignee_id
- due_date, acceptance_criteria

### agents（Agent 服务）
- id, name, description, category
- input_schema (JSONB)
- pricing_model

### agent_orders（Agent 订单）
- id, workspace_id, agent_id, user_id
- status, input_params, output_result

## 2. 关系设计
- workspace 1:N canvas_nodes
- workspace 1:N tasks
- canvas_node N:M canvas_node (references)
- task N:M canvas_node (linked_nodes)

详细文档：docs/architecture/04-data-models.md

参考：
- [[arch-backend]] 后端架构`,
    tags: ["stage/dev", "type/doc", "priority/critical"],
    parentId: "arch-1",
    references: ["arch-backend"],
  },

  // 27-30. Implementation Tasks
  {
    id: "task-canvas-impl",
    title: "☑️ Canvas 核心功能实现",
    type: "task",
    position: { x: 1230, y: 1360 },
    content: `# Canvas 核心功能实现

## 验收标准
- [ ] 节点 CRUD 操作
- [ ] 拖拽流畅（60fps）
- [ ] 支持缩放平移（Cmd+滚轮缩放，默认滚轮平移）
- [ ] 层级折叠展开
- [ ] 战略分区显示
- [ ] 节点引用跳转（[[node-id]] 语法）

## 技术实现
- React + Zustand
- 拖拽：react-dnd 或原生事件
- 性能优化：虚拟化大画布

参考：
- [[feature-canvas]] Canvas 功能设计
- [[arch-frontend]] 前端架构`,
    tags: ["stage/dev", "type/feature", "priority/critical"],
    taskStatus: "in-progress",
    assignee: "Alex",
    dueDate: "2024-12-15",
    references: ["feature-canvas", "arch-frontend"],
  },

  {
    id: "task-ai-integration",
    title: "☑️ AI 对话集成",
    type: "task",
    position: { x: 1230, y: 1680 },
    content: `# AI 对话集成

## 验收标准
- [ ] Claude API 调用
- [ ] 流式输出
- [ ] MCP 工具调用（创建节点、更新任务）
- [ ] 上下文管理（自动附加当前文档）

## 技术选型
- Anthropic Claude Sonnet 4.5
- Vercel AI SDK
- MCP SDK

参考：
- [[ai-integration]] AI 能力集成
- [[feature-canvas-ai]] Canvas AI 增强`,
    tags: ["stage/dev", "type/feature", "priority/high"],
    taskStatus: "todo",
    assignee: "Sarah",
    dueDate: "2024-12-20",
    references: ["ai-integration", "feature-canvas-ai"],
  },

  {
    id: "task-task-center",
    title: "☑️ 任务中心开发",
    type: "task",
    position: { x: 1230, y: 2000 },
    content: `# 任务中心开发

## 验收标准
- [ ] 看板视图（按状态分列）
- [ ] 列表视图（过滤、排序）
- [ ] 任务 CRUD
- [ ] 活动流 & 评论
- [ ] 批量操作

## 技术实现
- 拖拽：@dnd-kit/core
- 虚拟滚动：@tanstack/react-virtual
- 实时同步：Supabase Realtime

参考：
- [[feature-task]] 任务管理设计
- [[data-model-task]] 任务数据模型`,
    tags: ["stage/dev", "type/feature", "priority/high"],
    taskStatus: "todo",
    assignee: "Alex",
    dueDate: "2024-12-25",
    references: ["feature-task", "data-model-task"],
  },

  {
    id: "task-agent-marketplace",
    title: "☑️ Agent 雇佣中心实现",
    type: "task",
    position: { x: 1230, y: 2320 },
    content: `# Agent 雇佣中心实现

## 验收标准
- [ ] 服务列表展示（分类筛选）
- [ ] 服务详情页
- [ ] 下单流程（表单 → 授权 → 支付）
- [ ] Agent 执行追踪
- [ ] 反馈与迭代

## 技术实现
- 支付：Stripe
- Agent 执行：后台队列（BullMQ）
- 进度通知：Supabase Realtime

参考：
- [[feature-agent]] Agent 雇佣中心设计
- [[feature-agent-exec]] Agent 执行与反馈`,
    tags: ["stage/dev", "type/feature", "priority/medium"],
    taskStatus: "todo",
    assignee: "Sarah",
    dueDate: "2025-01-05",
    references: ["feature-agent", "feature-agent-exec"],
  },

  // 31-35. Supporting Features
  {
    id: "ai-integration",
    title: "AI 能力集成设计",
    type: "document",
    position: { x: 1190, y: 2640 },
    content: `# AI 能力集成设计

## 1. AI Provider 架构
- 统一的 AI 接口抽象
- 支持多 Provider（Claude, GPT-4）
- 用户无需关心模型细节

## 2. MCP 工具系统
AI 可执行的操作：
- create_canvas_node
- update_canvas_node
- create_task
- update_task

用户确认机制（重要操作需确认）

## 3. RAG 上下文管理
- 项目知识库自动构建
- 对话中引用项目文档
- 上下文相关性评分

## 4. 对话历史管理
- 历史记录保存（每个 workspace）
- 对话归档
- 对话搜索

参考：
- [[feature-canvas-ai]] Canvas AI
- [[arch-backend]] 后端架构`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    references: ["feature-canvas-ai", "arch-backend"],
  },

  {
    id: "realtime-collab",
    title: "实时协作设计",
    type: "document",
    position: { x: 1190, y: 2960 },
    content: `# 实时协作设计

## 1. WebSocket 同步
- Supabase Realtime
- 操作延迟 < 500ms
- 断线重连自动同步

## 2. 在线状态
- 成员在线/离线
- 最近活跃时间
- 在线人数统计

## 3. 协作光标（Canvas）
- 显示其他人的鼠标位置
- 显示正在编辑的节点
- 协作光标带用户名和头像

## 4. 冲突检测
- 同时编辑同一节点 → 冲突提示
- 冲突解决：先保存成功，后保存需合并

参考：
- [[feature-task-collab]] 任务协作
- [[arch-frontend]] 前端架构`,
    tags: ["stage/dev", "type/doc", "priority/medium"],
    references: ["feature-task-collab", "arch-frontend"],
  },

  {
    id: "notification",
    title: "通知系统设计",
    type: "document",
    position: { x: 1190, y: 3280 },
    content: `# 通知系统设计

## 1. 通知分级
- **关键通知**（Agent 完成、任务 @）：弹窗
- **一般通知**（任务状态变更）：红点
- **低优先级**（成员上线）：仅通知中心

## 2. 通知聚合
- 相同类型通知合并
- "3 个任务被更新" 而非 3 条单独通知

## 3. 推送策略
- 浏览器内弹窗
- 浏览器通知（需授权）
- 邮件通知（可选）

## 4. 通知设置
- 自定义通知级别
- 免打扰时段
- 按项目设置偏好

参考：
- [[feature-agent-exec]] Agent 执行反馈`,
    tags: ["stage/dev", "type/doc", "priority/medium"],
    references: ["feature-agent-exec"],
  },

  // ============================================
  // LAUNCH ZONE (1650-2150)
  // ============================================

  // 36-40. Launch & Operations
  {
    id: "launch-plan",
    title: "产品发布计划",
    type: "document",
    position: { x: 1740, y: 80 },
    content: `# 产品发布计划

## Phase 1: Private Beta (Week 1-2)
- 邀请 20-30 位种子用户
- 收集反馈，快速迭代
- 目标：功能可用性验证

## Phase 2: Public Beta (Week 3-4)
- Product Hunt 发布
- Indie Hackers 社区推广
- Reddit r/SaaS 分享
- 目标：获取 500 用户

## Phase 3: Official Launch (Week 5-6)
- 完善文档和教程
- 视频演示
- 付费计划上线
- 目标：1000+ 用户，50+ 付费用户

参考：
- [[marketing-strategy]] 营销策略
- [[growth-plan]] 增长计划`,
    tags: ["stage/launch", "type/plan", "priority/high"],
    children: ["marketing-strategy", "growth-plan"],
    references: ["marketing-strategy", "growth-plan"],
  },

  {
    id: "marketing-strategy",
    title: "营销策略",
    type: "document",
    position: { x: 1760, y: 400 },
    content: `# 营销策略

## 1. 内容营销
- 博客文章：《如何用 AI 加速产品开发》
- Twitter 分享开发过程
- YouTube 视频教程

## 2. 社区推广
- Product Hunt 发布
- Indie Hackers 案例分享
- Reddit r/SideProject, r/indiehackers

## 3. SEO 优化
- 关键词：AI project management, indie hacker tools
- Landing Page 优化

## 4. 早期用户计划
- 终身免费计划（前 100 用户）
- 推荐奖励

参考：
- [[launch-plan]] 发布计划`,
    tags: ["stage/launch", "type/doc"],
    parentId: "launch-plan",
    references: ["launch-plan"],
  },

  {
    id: "growth-plan",
    title: "增长计划",
    type: "document",
    position: { x: 1760, y: 720 },
    content: `# 增长计划

## 北极星指标
- 月活用户（MAU）
- 创建的 Canvas 节点数
- 雇佣的 Agent 次数

## 增长策略
1. **激活**：新用户完成首次 Agent 雇佣
2. **留存**：每周至少 2 次使用
3. **推荐**：满意用户邀请好友

## 数据追踪
- Mixpanel / PostHog
- 用户行为分析
- 漏斗优化

参考：
- [[launch-plan]] 发布计划`,
    tags: ["stage/launch", "type/doc"],
    parentId: "launch-plan",
    references: ["launch-plan"],
  },

  {
    id: "pricing-model",
    title: "定价模型",
    type: "document",
    position: { x: 1740, y: 1040 },
    content: `# 定价模型

## Free Plan
- 1 个 workspace
- 无限 Canvas 节点
- 无限任务
- 每月 3 次 Agent 雇佣

## Pro Plan ($15/月)
- 无限 workspace
- 每月 20 次 Agent 雇佣
- 优先支持

## Team Plan ($49/月)
- 最多 10 人
- 每月 100 次 Agent 雇佣
- 团队协作功能
- Admin 权限管理

参考：
- [[feature-agent]] Agent 定价策略`,
    tags: ["stage/launch", "type/doc"],
    references: ["feature-agent"],
  },

  {
    id: "analytics-setup",
    title: "数据分析系统搭建",
    type: "task",
    position: { x: 1760, y: 1360 },
    content: `# 数据分析系统搭建

## 验收标准
- [ ] 埋点 SDK 集成（PostHog）
- [ ] 核心事件追踪
  - 用户注册
  - Canvas 节点创建
  - 任务创建
  - Agent 雇佣
- [ ] Dashboard 搭建

## 关键指标
- DAU / MAU
- 留存率（D1, D7, D30）
- Agent 雇佣转化率

参考：
- [[growth-plan]] 增长计划`,
    tags: ["stage/launch", "type/feature", "priority/medium"],
    taskStatus: "todo",
    assignee: "Alex",
    dueDate: "2024-12-22",
    references: ["growth-plan"],
  },
];

// Mock feed activities
export const MOCK_FEED: { [key: string]: FeedActivity[] } = {
  "task-canvas-impl": [
    {
      id: "feed-1",
      type: "status_changed",
      user: "Alex",
      timestamp: "2024-12-09 14:30",
      description: "将状态更改为「进行中」",
      details: "从「待开始」→「进行中」",
    },
    {
      id: "feed-2",
      type: "comment_added",
      user: "Sarah",
      timestamp: "2024-12-09 12:15",
      description: "添加了评论",
    },
    {
      id: "feed-3",
      type: "created",
      user: "Alex",
      timestamp: "2024-12-08 16:20",
      description: "创建了此任务",
    },
  ],
  "market-research-1": [
    {
      id: "feed-4",
      type: "agent_completed",
      user: "Reddit 调研 Agent",
      timestamp: "2024-12-08 15:30",
      description: "完成了市场调研报告",
      details: "扫描了 5 个 Subreddit，分析了 127 条讨论",
    },
    {
      id: "feed-5",
      type: "created",
      user: "Sarah",
      timestamp: "2024-12-08 14:00",
      description: "雇佣了 Reddit 调研 Agent",
    },
  ],
  "vision-1": [
    {
      id: "feed-6",
      type: "updated",
      user: "Alex",
      timestamp: "2024-12-09 11:45",
      description: "更新了产品愿景文档",
    },
    {
      id: "feed-7",
      type: "comment_added",
      user: "Sarah",
      timestamp: "2024-12-08 18:30",
      description: "添加了评论",
    },
    {
      id: "feed-8",
      type: "created",
      user: "Sarah",
      timestamp: "2024-12-08 10:00",
      description: "创建了此文档",
    },
  ],
};

// Mock comments
export const MOCK_COMMENTS: { [key: string]: Comment[] } = {
  "task-canvas-impl": [
    {
      id: "comment-1",
      user: "Sarah",
      content: "@Alex Canvas 拖拽功能进展如何？我准备开始测试了",
      timestamp: "2024-12-09 12:15",
      mentions: ["Alex"],
    },
    {
      id: "comment-2",
      user: "Alex",
      content: "拖拽基本完成，节点引用跳转功能还在调试，预计今天完成",
      timestamp: "2024-12-09 13:40",
    },
  ],
  "market-research-1": [
    {
      id: "comment-3",
      user: "Alex",
      content: "调研结果很有价值！用户痛点和我们的产品定位完全吻合",
      timestamp: "2024-12-08 16:00",
    },
  ],
  "vision-1": [
    {
      id: "comment-4",
      user: "Sarah",
      content: "产品愿景很清晰，建议补充量化的目标数据",
      timestamp: "2024-12-08 18:30",
    },
    {
      id: "comment-5",
      user: "Alex",
      content: "同意，我会在下个版本补充具体的增长目标",
      timestamp: "2024-12-09 09:15",
    },
  ],
};

// Mock AI suggestions
export const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: "sug-1",
    type: "add-node",
    title: "建议添加「用户反馈收集」节点",
    description: "在 Launch 阶段缺少用户反馈机制，建议添加反馈收集流程节点",
  },
  {
    id: "sug-2",
    type: "add-tag",
    title: "为「任务管理」添加 priority/critical 标签",
    description: "这是核心功能，建议标记为关键优先级",
  },
  {
    id: "sug-3",
    type: "refine-content",
    title: "「产品愿景」可以更具体",
    description: "建议补充量化目标，如「3 个月内获得 1000 用户」",
  },
];
