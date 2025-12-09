/**
 * Mock Canvas Data for CrossMind Demo - V2 Optimized Layout
 *
 * Layout Strategy:
 * - Denser vertical spacing (160-180px instead of 280-320px)
 * - Multi-column layout within each zone
 * - Better visual hierarchy with horizontal expansion
 * - Strategic zones: Ideation (0-500), Design (550-1050), Development (1100-1600), Launch (1650-2150)
 */

import type {
  CanvasNode,
  FeedActivity,
  Comment,
  AISuggestion,
} from "./mock-data";

// Re-export types
export type { CanvasNode, FeedActivity, Comment, AISuggestion };

export const MOCK_NODES: CanvasNode[] = [
  // ============================================
  // IDEATION ZONE (0-500) - Column layout
  // Column 1: x=50, Column 2: x=250
  // ============================================

  // Vision & Research Branch (Column 1)
  {
    id: "vision-1",
    title: "CrossMind 产品愿景",
    type: "document",
    position: { x: 50, y: 40 },
    content: `# CrossMind 产品愿景

## 核心理念
从想法到产品，用 AI 加速小团队的创造力。

## 目标用户
- Indie Hackers
- 3-10 人小团队
- 技术型创业者

参考文档：
- [[prd-1]] 产品需求文档
- [[personas-1]] 用户画像`,
    tags: ["stage/ideation", "type/vision", "priority/critical"],
    children: ["market-research-1", "competitor-1"],
    references: ["prd-1", "personas-1"],
  },

  {
    id: "market-research-1",
    title: "市场调研报告",
    type: "agent",
    position: { x: 70, y: 200 },
    content: `# 市场调研报告

🤖 由 Reddit 调研 Agent 生成

## 核心发现
1. **工具过于复杂**（提及 156 次）
2. **缺乏 AI 辅助**（提及 89 次）
3. **知识散落各处**（提及 73 次）

参考：[[vision-1]]`,
    tags: ["stage/research", "type/research"],
    parentId: "vision-1",
    agentName: "Reddit 调研 Agent",
    generatedAt: "2024-12-08 15:30",
    references: ["vision-1"],
  },

  {
    id: "competitor-1",
    title: "竞品分析",
    type: "document",
    position: { x: 70, y: 360 },
    content: `# 竞品分析

## Notion vs Miro vs Linear

**CrossMind 差异化**:
1. Canvas + 任务双模式
2. AI Agent 雇佣中心
3. 自动知识积累

参考：[[vision-1]]`,
    tags: ["stage/research", "type/analysis"],
    parentId: "vision-1",
    references: ["vision-1"],
  },

  // User Research Branch (Column 2)
  {
    id: "personas-1",
    title: "用户画像",
    type: "document",
    position: { x: 250, y: 40 },
    content: `# 用户画像

## Sarah - Indie Hacker
独立开发者，想法多但无法系统化管理

## Alex - 技术创业者
3 人小团队 CTO，需要轻量级协作工具

参考：[[vision-1]] [[journey-1]]`,
    tags: ["stage/ideation", "type/doc"],
    references: ["vision-1", "journey-1"],
  },

  {
    id: "journey-1",
    title: "用户旅程设计",
    type: "document",
    position: { x: 250, y: 200 },
    content: `# 用户旅程设计

## 场景 1: 想法孵化
Canvas 创建 → AI 建议 → Agent 调研 → 完善想法

## 场景 2: 团队协作
分配任务 → 评论讨论 → Agent 更新 → 查看活动流

参考：[[personas-1]] [[onboarding-1]]`,
    tags: ["stage/ideation", "type/doc"],
    references: ["personas-1", "onboarding-1"],
  },

  // Feature Ideas (Column 2, bottom)
  {
    id: "idea-github",
    title: "💡 集成 GitHub Issues",
    type: "idea",
    position: { x: 250, y: 360 },
    content: `💡 同步 GitHub Issues 到任务看板？

优点：减少工具切换
疑问：是否增加复杂度？

相关：[[feature-task]]`,
    tags: ["stage/ideation", "type/idea", "priority/medium"],
    references: ["feature-task"],
  },

  {
    id: "idea-mobile",
    title: "💡 移动端支持",
    type: "idea",
    position: { x: 250, y: 490 },
    content: `💡 PWA vs React Native？

用户场景：
- 通勤时查看任务
- 快速回复评论
- Agent 完成通知`,
    tags: ["stage/ideation", "type/idea", "priority/low"],
  },

  // ============================================
  // DESIGN ZONE (550-1050) - Multi-column layout
  // Column 1: x=560, Column 2: x=760
  // ============================================

  // PRD Branch (Column 1)
  {
    id: "prd-1",
    title: "产品需求文档 (PRD)",
    type: "document",
    position: { x: 560, y: 40 },
    content: `# CrossMind PRD

## 1. 产品概述
参考：[[vision-1]]

## 2. 功能模块
- [[feature-canvas]] Canvas 画布
- [[feature-task]] 任务中心
- [[feature-agent]] Agent 雇佣中心

## 3. 验收标准
- 新用户 5 分钟上手
- Canvas 操作 < 100ms`,
    tags: ["stage/design", "type/doc", "priority/critical"],
    children: ["feature-canvas", "feature-task", "feature-agent"],
    references: ["vision-1", "feature-canvas", "feature-task", "feature-agent"],
  },

  {
    id: "feature-canvas",
    title: "Canvas 核心功能",
    type: "document",
    position: { x: 580, y: 200 },
    content: `# Canvas 核心功能

## 1. 节点管理
- 📄 Document / 💡 Idea / ☑️ Task / 🤖 Agent

## 2. 画布操作
- Cmd+滚轮缩放
- 默认滚轮平移

## 3. 节点引用
支持 [[node-id]] 语法跳转

参考：[[prd-1]] [[feature-canvas-ai]]`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-canvas-ai"],
    references: ["prd-1", "feature-canvas-ai"],
  },

  {
    id: "feature-canvas-ai",
    title: "Canvas AI 增强",
    type: "document",
    position: { x: 600, y: 360 },
    content: `# Canvas AI 增强

## 1. AI 对话面板
- 流式输出
- 自动附加上下文

## 2. 智能建议
- 缺失模块提示
- 自动拆解节点
- 关系推理

## 3. MCP 工具调用
AI 可直接操作 Canvas

参考：[[feature-canvas]]`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "feature-canvas",
    references: ["feature-canvas"],
  },

  {
    id: "feature-task",
    title: "任务管理功能",
    type: "document",
    position: { x: 580, y: 520 },
    content: `# 任务管理功能

## 1. 任务字段
状态、优先级、负责人、截止日期

## 2. 视图模式
- 看板视图（按状态分列）
- 列表视图（多维过滤）

## 3. 任务关系
- 子任务（最多 3 层）
- 依赖关系

参考：[[prd-1]] [[feature-task-collab]]`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-task-collab"],
    references: ["prd-1", "feature-task-collab"],
  },

  {
    id: "feature-task-collab",
    title: "任务协作功能",
    type: "document",
    position: { x: 600, y: 680 },
    content: `# 任务协作功能

## 1. 活动流
- 状态变更
- Agent 自动更新

## 2. 评论系统
- @ 提醒功能
- Markdown 支持

## 3. 角色权限
Owner / Member / Guest

参考：[[feature-task]]`,
    tags: ["stage/design", "type/doc", "priority/medium"],
    parentId: "feature-task",
    references: ["feature-task"],
  },

  {
    id: "feature-agent",
    title: "Agent 雇佣中心",
    type: "document",
    position: { x: 580, y: 840 },
    content: `# Agent 雇佣中心

## 1. 服务分类
- 想法验证：Reddit 调研、竞品分析
- 设计阶段：PRD 生成、头脑风暴
- 开发阶段：代码生成、技术选型
- 运营阶段：营销文案、数据分析

## 2. 定价模型
基础迭代 3-7 次，超出付费

参考：[[prd-1]] [[feature-agent-exec]]`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-agent-exec"],
    references: ["prd-1", "feature-agent-exec"],
  },

  {
    id: "feature-agent-exec",
    title: "Agent 执行与反馈",
    type: "document",
    position: { x: 600, y: 1000 },
    content: `# Agent 执行与反馈

## 1. 临时账号
虚拟成员身份，权限限制

## 2. 执行追踪
实时进度更新

## 3. 反馈迭代
"还剩 X 次免费迭代"

参考：[[feature-agent]]`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "feature-agent",
    references: ["feature-agent"],
  },

  // Supporting Features (Column 2)
  {
    id: "feature-tagging",
    title: "标签系统设计",
    type: "document",
    position: { x: 760, y: 40 },
    content: `# 标签系统设计

## Namespace 体系
\`\`\`
type/*      类型标签
stage/*     阶段标签
priority/*  优先级标签
skill/*     技能标签
\`\`\`

## Canvas 和 Task 共享标签池`,
    tags: ["stage/design", "type/doc", "priority/medium"],
    references: ["feature-canvas", "feature-task"],
  },

  {
    id: "design-system",
    title: "设计系统",
    type: "document",
    position: { x: 760, y: 200 },
    content: `# 设计系统

## 设计原则
1. 简洁至上
2. 快速反馈 < 100ms
3. AI 自然融入

## 色彩系统
- Document: 蓝色
- Idea: 黄色
- Task: 绿色
- Agent: 紫色`,
    tags: ["stage/design", "type/doc"],
  },

  {
    id: "onboarding-1",
    title: "新手引导设计",
    type: "document",
    position: { x: 760, y: 360 },
    content: `# 新手引导设计

## MVP 精简为 3 步
1. 查看 Canvas 示例
2. 雇佣第一个 Agent（免费）
3. 创建任务追踪进度

## 完成庆祝
🎉 "你已掌握 CrossMind 核心流程！"

参考：[[journey-1]]`,
    tags: ["stage/design", "type/doc", "priority/high"],
    references: ["journey-1"],
  },

  // ============================================
  // DEVELOPMENT ZONE (1100-1600) - Multi-column
  // Column 1: x=1110, Column 2: x=1310
  // ============================================

  // Architecture Branch (Column 1)
  {
    id: "arch-1",
    title: "技术架构设计",
    type: "document",
    position: { x: 1110, y: 40 },
    content: `# 技术架构设计

## 五层架构
1. 展示层（Next.js + React）
2. 业务逻辑层（Server Actions）
3. AI 能力层（Claude）
4. 数据持久层（Supabase）
5. 基础设施层（Vercel）

参考：[[arch-frontend]] [[arch-backend]]`,
    tags: ["stage/dev", "type/doc", "priority/critical"],
    children: ["arch-frontend", "arch-backend", "data-models"],
    references: ["arch-frontend", "arch-backend"],
  },

  {
    id: "arch-frontend",
    title: "前端架构设计",
    type: "document",
    position: { x: 1130, y: 200 },
    content: `# 前端架构设计

## 技术栈
- Next.js 14 (App Router)
- React Server Components
- Tailwind CSS + shadcn/ui
- Zustand (状态管理)

## 性能优化
- RSC 减少客户端 JS
- 懒加载
- 虚拟滚动

参考：[[arch-1]]`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    parentId: "arch-1",
    references: ["arch-1"],
  },

  {
    id: "arch-backend",
    title: "后端架构设计",
    type: "document",
    position: { x: 1130, y: 360 },
    content: `# 后端架构设计

## 技术栈
- Supabase (PostgreSQL + Auth + Realtime)
- Drizzle ORM
- Server Actions

## AI 集成
- Anthropic Claude API
- RAG (pgvector)

参考：[[arch-1]] [[data-models]]`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    parentId: "arch-1",
    references: ["arch-1", "data-models"],
  },

  {
    id: "data-models",
    title: "数据模型设计",
    type: "document",
    position: { x: 1130, y: 520 },
    content: `# 数据模型设计

## 核心表
- workspaces（工作空间）
- canvas_nodes（Canvas 节点）
- tasks（任务）
- agents（Agent 服务）
- agent_orders（订单）

详细文档：docs/architecture/04-data-models.md`,
    tags: ["stage/dev", "type/doc", "priority/critical"],
    parentId: "arch-1",
  },

  // Implementation Tasks (Column 1, bottom)
  {
    id: "task-canvas-impl",
    title: "☑️ Canvas 核心功能实现",
    type: "task",
    position: { x: 1130, y: 680 },
    content: `# Canvas 核心功能实现

## 验收标准
- [x] 节点 CRUD 操作
- [x] 拖拽流畅（60fps）
- [x] 缩放平移
- [x] 节点引用跳转

参考：[[feature-canvas]]`,
    tags: ["stage/dev", "type/feature", "priority/critical"],
    taskStatus: "in-progress",
    assignee: "Alex",
    dueDate: "2024-12-15",
    references: ["feature-canvas"],
  },

  {
    id: "task-ai-integration",
    title: "☑️ AI 对话集成",
    type: "task",
    position: { x: 1130, y: 840 },
    content: `# AI 对话集成

## 验收标准
- [ ] Claude API 调用
- [ ] 流式输出
- [ ] MCP 工具调用
- [ ] 上下文管理

参考：[[feature-canvas-ai]]`,
    tags: ["stage/dev", "type/feature", "priority/high"],
    taskStatus: "todo",
    assignee: "Sarah",
    dueDate: "2024-12-20",
    references: ["feature-canvas-ai"],
  },

  {
    id: "task-task-center",
    title: "☑️ 任务中心开发",
    type: "task",
    position: { x: 1130, y: 1000 },
    content: `# 任务中心开发

## 验收标准
- [ ] 看板视图
- [ ] 列表视图
- [ ] 活动流 & 评论
- [ ] 批量操作

参考：[[feature-task]]`,
    tags: ["stage/dev", "type/feature", "priority/high"],
    taskStatus: "todo",
    assignee: "Alex",
    dueDate: "2024-12-25",
    references: ["feature-task"],
  },

  // Supporting Systems (Column 2)
  {
    id: "ai-integration",
    title: "AI 能力集成设计",
    type: "document",
    position: { x: 1310, y: 40 },
    content: `# AI 能力集成设计

## MCP 工具系统
AI 可执行的操作：
- create_canvas_node
- update_canvas_node
- create_task
- update_task

## RAG 上下文管理
项目知识库自动构建`,
    tags: ["stage/dev", "type/doc", "priority/high"],
  },

  {
    id: "realtime-collab",
    title: "实时协作设计",
    type: "document",
    position: { x: 1310, y: 200 },
    content: `# 实时协作设计

## WebSocket 同步
- Supabase Realtime
- 操作延迟 < 500ms

## 协作光标
- 显示其他人的鼠标
- 正在编辑的节点高亮

## 冲突检测
先保存成功，后保存提示冲突`,
    tags: ["stage/dev", "type/doc", "priority/medium"],
  },

  {
    id: "notification",
    title: "通知系统设计",
    type: "document",
    position: { x: 1310, y: 360 },
    content: `# 通知系统设计

## 通知分级
- 关键通知（Agent 完成）：弹窗
- 一般通知（状态变更）：红点
- 低优先级（成员上线）：仅通知中心

## 通知聚合
"3 个任务被更新" vs 3 条通知`,
    tags: ["stage/dev", "type/doc", "priority/medium"],
  },

  // ============================================
  // LAUNCH ZONE (1650-2150) - Compact layout
  // Column 1: x=1660, Column 2: x=1860
  // ============================================

  // Launch Planning (Column 1)
  {
    id: "launch-plan",
    title: "产品发布计划",
    type: "document",
    position: { x: 1660, y: 40 },
    content: `# 产品发布计划

## Phase 1: Private Beta (Week 1-2)
邀请 20-30 位种子用户

## Phase 2: Public Beta (Week 3-4)
Product Hunt 发布

## Phase 3: Official Launch (Week 5-6)
目标：1000+ 用户，50+ 付费

参考：[[marketing-strategy]] [[growth-plan]]`,
    tags: ["stage/launch", "type/plan", "priority/high"],
    children: ["marketing-strategy", "growth-plan"],
    references: ["marketing-strategy", "growth-plan"],
  },

  {
    id: "marketing-strategy",
    title: "营销策略",
    type: "document",
    position: { x: 1680, y: 200 },
    content: `# 营销策略

## 1. 内容营销
博客、Twitter、YouTube

## 2. 社区推广
Product Hunt、Indie Hackers、Reddit

## 3. SEO 优化
关键词：AI project management

## 4. 早期用户计划
终身免费（前 100 用户）`,
    tags: ["stage/launch", "type/doc"],
    parentId: "launch-plan",
  },

  {
    id: "growth-plan",
    title: "增长计划",
    type: "document",
    position: { x: 1680, y: 360 },
    content: `# 增长计划

## 北极星指标
- 月活用户（MAU）
- 创建的 Canvas 节点数
- 雇佣的 Agent 次数

## 增长策略
1. 激活：首次 Agent 雇佣
2. 留存：每周 2 次使用
3. 推荐：邀请好友`,
    tags: ["stage/launch", "type/doc"],
    parentId: "launch-plan",
  },

  // Operations (Column 2)
  {
    id: "pricing-model",
    title: "定价模型",
    type: "document",
    position: { x: 1860, y: 40 },
    content: `# 定价模型

## Free Plan
- 1 个 workspace
- 每月 3 次 Agent

## Pro Plan ($15/月)
- 无限 workspace
- 每月 20 次 Agent

## Team Plan ($49/月)
- 最多 10 人
- 每月 100 次 Agent`,
    tags: ["stage/launch", "type/doc"],
  },

  {
    id: "analytics-setup",
    title: "数据分析系统搭建",
    type: "task",
    position: { x: 1860, y: 200 },
    content: `# 数据分析系统搭建

## 验收标准
- [ ] PostHog 集成
- [ ] 核心事件追踪
- [ ] Dashboard 搭建

## 关键指标
- DAU / MAU
- 留存率（D1, D7, D30）
- Agent 雇佣转化率`,
    tags: ["stage/launch", "type/feature", "priority/medium"],
    taskStatus: "todo",
    assignee: "Alex",
    dueDate: "2024-12-22",
  },
];

// Keep MOCK_FEED, MOCK_COMMENTS, MOCK_SUGGESTIONS unchanged
export { MOCK_FEED, MOCK_COMMENTS, MOCK_SUGGESTIONS } from "./mock-data";
