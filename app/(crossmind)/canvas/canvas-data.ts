/**
 * Canvas Data Structure - Separated Content and Layout
 *
 * Architecture:
 * - Content: Business logic, immutable node data
 * - Layout: Visual positioning, can be recalculated
 */

// ============================================
// Core Types
// ============================================

export interface NodeContent {
  id: string;
  title: string;
  type: "document" | "idea" | "task" | "inspiration";
  content: string;
  tags: string[];
  parentId?: string;
  children?: string[];
  references?: string[];
  // Display order for sorting (drag-drop support)
  displayOrder?: number;
  // Task-specific
  taskStatus?: "todo" | "in-progress" | "done";
  assignee?: string;
  dueDate?: string;
  // Inspiration-specific
  source?: string;
  capturedAt?: string;
  // Framework zone mappings (节点到各框架区域的映射关系)
  // 格式: { "framework-id": { "zone-id": weight } }
  // weight 越高,节点越适合放在该区域 (1-10)
  zoneAffinities?: Record<string, Record<string, number>>;
  // Health data (付费功能)
  healthScore?: number;
  healthLevel?: "critical" | "warning" | "good" | "excellent";
  healthData?: {
    dimensions: {
      completeness: { score: number; issues: string[] };
      logic: { score: number; issues: string[] };
      feasibility: { score: number; issues: string[] };
    };
    suggestions: string[];
  };
}

export interface NodeLayout {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FeedActivity {
  id: string;
  type: "created" | "updated" | "status_changed" | "tag_added" | "comment_added";
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

// ============================================
// Thinking Frameworks
// ============================================

// Zone color palette - Fixed base colors with semantic naming
export const ZONE_COLORS = {
  orange: { base: "#FF9800", label: "#E65100" },
  blue: { base: "#2196F3", label: "#0D47A1" },
  green: { base: "#4CAF50", label: "#1B5E20" },
  pink: { base: "#E91E63", label: "#880E4F" },
  purple: { base: "#9C27B0", label: "#4A148C" },
  teal: { base: "#009688", label: "#004D40" },
  amber: { base: "#FFC107", label: "#FF6F00" },
  cyan: { base: "#00BCD4", label: "#006064" },
  lime: { base: "#CDDC39", label: "#827717" },
  indigo: { base: "#3F51B5", label: "#1A237E" },
  red: { base: "#F44336", label: "#B71C1C" },
  lightGreen: { base: "#8BC34A", label: "#33691E" },
} as const;

export type ZoneColorKey = keyof typeof ZONE_COLORS;

export interface ThinkingFramework {
  id: string;
  name: string;
  icon: string;
  description: string;
  zones: {
    id: string;
    name: string;
    colorKey: ZoneColorKey;
    description?: string;
  }[];
}

export const FRAMEWORKS: ThinkingFramework[] = [
  {
    id: "product-dev",
    name: "产品开发流程",
    icon: "🚀",
    description: "从想法到上线的完整产品开发流程",
    zones: [
      { id: "ideation", name: "想法孵化", colorKey: "orange", description: "探索和验证产品想法" },
      { id: "design", name: "设计规划", colorKey: "blue", description: "定义产品功能和用户体验" },
      { id: "dev", name: "开发实现", colorKey: "green", description: "技术实现和测试" },
      { id: "launch", name: "发布运营", colorKey: "pink", description: "上线和市场推广" },
    ],
  },
  {
    id: "business-canvas",
    name: "商业模式画布",
    icon: "🎨",
    description: "系统分析商业模式的9个核心要素",
    zones: [
      { id: "customer", name: "客户细分", colorKey: "orange" },
      { id: "value", name: "价值主张", colorKey: "indigo" },
      { id: "channels", name: "渠道通路", colorKey: "teal" },
      { id: "relationship", name: "客户关系", colorKey: "purple" },
      { id: "revenue", name: "收入来源", colorKey: "green" },
      { id: "resources", name: "核心资源", colorKey: "amber" },
      { id: "activities", name: "关键业务", colorKey: "orange" },
      { id: "partners", name: "重要合作", colorKey: "pink" },
      { id: "costs", name: "成本结构", colorKey: "red" },
    ],
  },
  {
    id: "saas-health",
    name: "SaaS 健康度",
    icon: "📊",
    description: "SaaS 产品的关键指标和健康度分析",
    zones: [
      { id: "growth", name: "增长指标", colorKey: "lightGreen", description: "用户增长和获客" },
      { id: "retention", name: "留存分析", colorKey: "cyan", description: "用户留存和流失" },
      { id: "monetization", name: "变现能力", colorKey: "amber", description: "收入和定价策略" },
      { id: "unit-economics", name: "单位经济", colorKey: "orange", description: "LTV/CAC 等核心指标" },
    ],
  },
  {
    id: "six-thinking-hats",
    name: "六顶思考帽",
    icon: "🎩",
    description: "从六个不同角度全面分析问题",
    zones: [
      { id: "white", name: "白帽-事实", colorKey: "cyan", description: "客观数据和信息" },
      { id: "red", name: "红帽-情感", colorKey: "red", description: "直觉和感受" },
      { id: "black", name: "黑帽-风险", colorKey: "indigo", description: "谨慎和风险评估" },
      { id: "yellow", name: "黄帽-乐观", colorKey: "amber", description: "积极面和机会" },
      { id: "green", name: "绿帽-创意", colorKey: "green", description: "创造性思维" },
      { id: "blue", name: "蓝帽-控制", colorKey: "blue", description: "流程控制和总结" },
    ],
  },
  {
    id: "lean-canvas",
    name: "精益创业画布",
    icon: "⚡",
    description: "快速验证创业想法的精益方法",
    zones: [
      { id: "problem", name: "问题", colorKey: "red" },
      { id: "solution", name: "解决方案", colorKey: "green" },
      { id: "unique-value", name: "独特价值", colorKey: "amber" },
      { id: "unfair-advantage", name: "壁垒优势", colorKey: "purple" },
      { id: "customer-segments", name: "客户细分", colorKey: "blue" },
      { id: "channels", name: "渠道", colorKey: "teal" },
      { id: "revenue", name: "收入来源", colorKey: "lightGreen" },
      { id: "cost", name: "成本结构", colorKey: "orange" },
      { id: "key-metrics", name: "关键指标", colorKey: "indigo" },
    ],
  },
];

// ============================================
// User Subscription Mock Data
// ============================================

export interface MockUser {
  subscriptionTier: "free" | "basic" | "pro";
  credits: number;
  chatUsage: { used: number; limit: number };
}

export const MOCK_USER: MockUser = {
  subscriptionTier: "basic", // 可通过调试工具切换
  credits: 100,
  chatUsage: { used: 25, limit: 100 },
};

// ============================================
// Content Data (Business Logic)
// ============================================

export const NODE_CONTENTS: NodeContent[] = [
  // === IDEATION ZONE ===
  {
    id: "vision-1",
    title: "CrossMind 产品愿景",
    type: "document",
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
    children: ["competitor-1"],
    references: ["prd-1", "personas-1"],
    zoneAffinities: {
      "product-dev": { "ideation": 10 },  // 产品开发框架: 完全属于想法孵化
      "business-canvas": { "value": 8, "customer": 5 },  // 商业画布: 主要是价值主张,兼顾客户细分
      "lean-canvas": { "unique-value": 9, "problem": 6 },  // 精益画布: 核心是独特价值
      "six-thinking-hats": { "blue": 10 },  // 六顶思考帽: 蓝帽-控制和总览
      "saas-health": { "growth": 7 },  // SaaS健康度: 偏向增长指标
    },
    healthScore: 78,
    healthLevel: "good",
    healthData: {
      dimensions: {
        completeness: { score: 85, issues: [] },
        logic: { score: 80, issues: [] },
        feasibility: { score: 70, issues: ["缺少具体的资源预算", "未明确3个月内的量化目标"] },
      },
      suggestions: ["建议补充团队规模和预算范围", "明确MVP的核心指标(如用户数)"],
    },
  },

  {
    id: "competitor-1",
    title: "竞品分析",
    type: "document",
    content: `# 竞品分析

## Notion vs Miro vs Linear

**CrossMind 差异化**:
1. Canvas + 任务双模式
2. AI 健康度诊断
3. 自动知识积累`,
    tags: ["stage/research", "type/analysis"],
    parentId: "vision-1",
    references: ["vision-1"],
    healthScore: 45,
    healthLevel: "critical",
    healthData: {
      dimensions: {
        completeness: { score: 40, issues: ["缺少定量对比数据", "未分析竞品定价策略", "缺少市场份额信息"] },
        logic: { score: 60, issues: ["差异化分析过于表面"] },
        feasibility: { score: 35, issues: ["未评估竞争壁垒的可行性"] },
      },
      suggestions: ["建议添加详细的功能对比表", "分析各竞品的优劣势", "评估进入市场的难度"],
    },
  },

  {
    id: "personas-1",
    title: "用户画像",
    type: "document",
    content: `# 用户画像

## Sarah - Indie Hacker
独立开发者，想法多但无法系统化管理

## Alex - 技术创业者
3 人小团队 CTO，需要轻量级协作工具`,
    tags: ["stage/ideation", "type/doc"],
    references: ["vision-1", "journey-1"],
  },

  {
    id: "journey-1",
    title: "用户旅程设计",
    type: "document",
    content: `# 用户旅程设计

## 场景 1: 想法孵化
Canvas 创建 → AI 建议 → 健康度诊断 → 完善想法

## 场景 2: 团队协作
分配任务 → 评论讨论 → 查看活动流`,
    tags: ["stage/ideation", "type/doc"],
    references: ["personas-1", "onboarding-1"],
  },

  {
    id: "idea-github",
    title: "💡 集成 GitHub Issues",
    type: "idea",
    content: `💡 同步 GitHub Issues 到任务看板？

优点：减少工具切换
疑问：是否增加复杂度？`,
    tags: ["stage/ideation", "type/idea", "priority/medium"],
    references: ["feature-task"],
  },

  // === DESIGN ZONE ===
  {
    id: "prd-1",
    title: "产品需求文档 (PRD)",
    type: "document",
    content: `# CrossMind PRD

## 功能模块
- [[feature-canvas]] Canvas 画布
- [[feature-task]] 任务中心

## 验收标准
- 新用户 5 分钟上手
- Canvas 操作 < 100ms`,
    tags: ["stage/design", "type/doc", "priority/critical"],
    children: ["feature-canvas", "feature-task"],
    references: ["vision-1", "feature-canvas", "feature-task"],
    zoneAffinities: {
      "product-dev": { "design": 10 },  // 产品开发: 设计规划阶段
      "business-canvas": { "value": 7, "activities": 6 },  // 商业画布: 价值主张和关键业务
      "lean-canvas": { "solution": 9, "unique-value": 7 },  // 精益画布: 解决方案为主
      "six-thinking-hats": { "yellow": 8, "blue": 6 },  // 六顶思考帽: 黄帽-乐观规划
      "saas-health": { "growth": 5, "retention": 5 },  // SaaS健康度: 平衡增长和留存
    },
    healthScore: 88,
    healthLevel: "excellent",
    healthData: {
      dimensions: {
        completeness: { score: 90, issues: [] },
        logic: { score: 92, issues: [] },
        feasibility: { score: 82, issues: [] },
      },
      suggestions: ["建议补充非功能性需求(性能/安全)", "可以添加更多用户场景"],
    },
  },

  {
    id: "feature-canvas",
    title: "Canvas 核心功能",
    type: "document",
    content: `# Canvas 核心功能

## 节点管理
📄 Document / 💡 Idea / ☑️ Task

## 画布操作
- Cmd+滚轮缩放
- 默认滚轮平移

## 节点引用
支持 [[node-id]] 语法跳转`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-canvas-ai"],
    references: ["prd-1", "feature-canvas-ai"],
  },

  {
    id: "feature-canvas-ai",
    title: "Canvas AI 增强",
    type: "document",
    content: `# Canvas AI 增强

## AI 对话面板
流式输出、自动附加上下文

## 智能建议
缺失模块提示、自动拆解节点

## MCP 工具调用
AI 可直接操作 Canvas`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "feature-canvas",
    references: ["feature-canvas"],
  },

  {
    id: "feature-task",
    title: "任务管理功能",
    type: "document",
    content: `# 任务管理功能

## 视图模式
- 看板视图（按状态分列）
- 列表视图（多维过滤）

## 任务关系
子任务（最多 3 层）、依赖关系`,
    tags: ["stage/design", "type/doc", "priority/high"],
    parentId: "prd-1",
    children: ["feature-task-collab"],
    references: ["prd-1", "feature-task-collab"],
  },

  {
    id: "feature-task-collab",
    title: "任务协作功能",
    type: "document",
    content: `# 任务协作功能

## 活动流 & 评论系统
- @ 提醒功能
- Markdown 支持

## 角色权限
Owner / Member / Guest`,
    tags: ["stage/design", "type/doc", "priority/medium"],
    parentId: "feature-task",
    references: ["feature-task"],
  },

  {
    id: "design-system",
    title: "设计系统",
    type: "document",
    content: `# 设计系统

## 设计原则
1. 简洁至上
2. 快速反馈 < 100ms
3. AI 自然融入

## 色彩系统
Document: 蓝 / Idea: 黄 / Task: 绿`,
    tags: ["stage/design", "type/doc"],
  },

  {
    id: "onboarding-1",
    title: "新手引导设计",
    type: "document",
    content: `# 新手引导设计

## MVP 精简为 2 步
1. 查看 Canvas 示例
2. 创建任务追踪进度

🎉 "你已掌握 CrossMind 核心流程！"`,
    tags: ["stage/design", "type/doc", "priority/high"],
    references: ["journey-1"],
  },

  // === DEVELOPMENT ZONE ===
  {
    id: "arch-1",
    title: "技术架构设计",
    type: "document",
    content: `# 技术架构设计

## 五层架构
1. 展示层（Next.js + React）
2. 业务逻辑层（Server Actions）
3. AI 能力层（Claude）
4. 数据持久层（Supabase）
5. 基础设施层（Vercel）`,
    tags: ["stage/dev", "type/doc", "priority/critical"],
    children: ["arch-frontend", "arch-backend"],
    references: ["arch-frontend", "arch-backend"],
    zoneAffinities: {
      "product-dev": { "dev": 10 },  // 产品开发: 开发实现阶段
      "business-canvas": { "resources": 9, "activities": 7 },  // 商业画布: 核心资源和关键业务
      "lean-canvas": { "solution": 8 },  // 精益画布: 技术解决方案
      "six-thinking-hats": { "white": 7, "black": 6 },  // 六顶思考帽: 白帽-技术事实,黑帽-技术风险
      "saas-health": { "unit-economics": 6 },  // SaaS健康度: 影响单位经济
    },
    healthScore: 72,
    healthLevel: "good",
    healthData: {
      dimensions: {
        completeness: { score: 75, issues: ["缺少数据库 schema 设计", "未说明缓存策略"] },
        logic: { score: 80, issues: [] },
        feasibility: { score: 62, issues: ["未评估 Supabase 的扩展性", "缺少成本估算"] },
      },
      suggestions: ["补充数据库 ER 图", "评估 Vercel 和 Supabase 的费用", "考虑灾备方案"],
    },
  },

  {
    id: "arch-frontend",
    title: "前端架构设计",
    type: "document",
    content: `# 前端架构设计

## 技术栈
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Zustand

## 性能优化
RSC、懒加载、虚拟滚动`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    parentId: "arch-1",
    references: ["arch-1"],
  },

  {
    id: "arch-backend",
    title: "后端架构设计",
    type: "document",
    content: `# 后端架构设计

## 技术栈
- Supabase (PostgreSQL + Auth)
- Drizzle ORM
- Server Actions

## AI 集成
Claude API、RAG (pgvector)`,
    tags: ["stage/dev", "type/doc", "priority/high"],
    parentId: "arch-1",
    references: ["arch-1"],
  },

  {
    id: "task-canvas-impl",
    title: "☑️ Canvas 核心功能实现",
    type: "task",
    content: `# Canvas 核心功能实现

## 验收标准
- [x] 节点 CRUD 操作
- [x] 拖拽流畅（60fps）
- [x] 缩放平移
- [x] 节点引用跳转`,
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
    content: `# AI 对话集成

## 验收标准
- [ ] Claude API 调用
- [ ] 流式输出
- [ ] MCP 工具调用`,
    tags: ["stage/dev", "type/feature", "priority/high"],
    taskStatus: "todo",
    assignee: "Sarah",
    dueDate: "2024-12-20",
    references: ["feature-canvas-ai"],
  },

  {
    id: "ai-integration",
    title: "AI 能力集成设计",
    type: "document",
    content: `# AI 能力集成设计

## MCP 工具系统
AI 可执行的操作：
- create_canvas_node
- update_canvas_node

## RAG 上下文
项目知识库自动构建`,
    tags: ["stage/dev", "type/doc", "priority/high"],
  },

  // === LAUNCH ZONE ===
  {
    id: "launch-plan",
    title: "产品发布计划",
    type: "document",
    content: `# 产品发布计划

## Phase 1: Private Beta
邀请 20-30 位种子用户

## Phase 2: Public Beta
Product Hunt 发布

## Phase 3: Official Launch
目标：1000+ 用户，50+ 付费`,
    tags: ["stage/launch", "type/plan", "priority/high"],
    children: ["marketing-strategy"],
    references: ["marketing-strategy"],
    zoneAffinities: {
      "product-dev": { "launch": 10 },  // 产品开发: 发布运营阶段
      "business-canvas": { "channels": 9, "customer": 7, "revenue": 6 },  // 商业画布: 渠道通路为主
      "lean-canvas": { "channels": 8, "key-metrics": 7 },  // 精益画布: 渠道和关键指标
      "six-thinking-hats": { "yellow": 7, "black": 8, "blue": 6 },  // 六顶思考帽: 平衡乐观和风险
      "saas-health": { "growth": 10 },  // SaaS健康度: 核心是增长指标
    },
    healthScore: 55,
    healthLevel: "warning",
    healthData: {
      dimensions: {
        completeness: { score: 60, issues: ["缺少具体时间线", "未定义成功指标", "缺少 Plan B"] },
        logic: { score: 65, issues: [] },
        feasibility: { score: 40, issues: ["种子用户从哪里来?", "Product Hunt 准备不足", "目标过于乐观"] },
      },
      suggestions: ["制定详细的用户获取渠道", "准备 Product Hunt 素材和文案", "设定里程碑和应急预案"],
    },
  },

  {
    id: "marketing-strategy",
    title: "营销策略",
    type: "document",
    content: `# 营销策略

## 内容营销
博客、Twitter、YouTube

## 社区推广
Product Hunt、Indie Hackers

## SEO 优化
AI project management

## 早期用户计划
终身免费（前 100 用户）`,
    tags: ["stage/launch", "type/doc"],
    parentId: "launch-plan",
  },

  {
    id: "pricing-model",
    title: "定价模型",
    type: "document",
    content: `# 定价模型

## Free Plan
Canvas 管理，无 AI 诊断

## Basic Plan ($9/月)
AI 健康度诊断，100 次对话/月

## Pro Plan ($29/月)
无限 AI 诊断和对话`,
    tags: ["stage/launch", "type/doc"],
    zoneAffinities: {
      "product-dev": { "launch": 8, "design": 4 },  // 产品开发: 主要在发布阶段
      "business-canvas": { "revenue": 10, "customer": 6 },  // 商业画布: 核心是收入来源
      "lean-canvas": { "revenue": 10, "customer-segments": 7 },  // 精益画布: 收入来源
      "six-thinking-hats": { "yellow": 6, "black": 7 },  // 六顶思考帽: 需要平衡乐观和风险
      "saas-health": { "monetization": 10, "unit-economics": 8 },  // SaaS健康度: 变现能力为主
    },
    healthScore: 62,
    healthLevel: "warning",
    healthData: {
      dimensions: {
        completeness: { score: 70, issues: ["缺少竞品定价对比"] },
        logic: { score: 65, issues: ["定价梯度是否合理需验证"] },
        feasibility: { score: 52, issues: ["未说明定价依据", "缺少用户调研支撑"] },
      },
      suggestions: ["调研用户付费意愿", "参考 Notion/Miro 定价策略", "考虑早鸟优惠方案"],
    },
  },

  // === INSPIRATION NODES ===
  {
    id: "insp-1",
    title: "💡 如何平衡速度与质量?",
    type: "inspiration",
    content: `"完美是优秀的敌人。先完成,再完美。"

— Reid Hoffman, LinkedIn 创始人

快速迭代比追求完美更重要。MVP的核心是验证假设,而不是打造完美产品。`,
    source: "《The Lean Startup》第3章",
    capturedAt: "2024-12-10 15:30",
    tags: ["stage/ideation", "type/insight"],
    references: ["vision-1"],
    zoneAffinities: {
      "product-dev": { "ideation": 9, "dev": 5 },  // 产品开发: 想法阶段的启发
      "business-canvas": { "value": 7 },  // 商业画布: 影响价值主张
      "lean-canvas": { "problem": 6, "solution": 7 },  // 精益画布: 问题和解决方案
      "six-thinking-hats": { "green": 10, "yellow": 7 },  // 六顶思考帽: 绿帽-创意思维
      "saas-health": { "growth": 6 },  // SaaS健康度: 影响增长策略
    },
  },

  {
    id: "insp-2",
    title: "💡 用户访谈的关键问题",
    type: "inspiration",
    content: `Mom Test 原则：不要问妈妈你的产品好不好。

关键三问：
1. 你现在如何解决这个问题？
2. 上次遇到是什么时候？
3. 你为此付出了什么代价？

避免问假设性问题,聚焦真实行为。`,
    source: "Chat with AI - 2024-12-09",
    capturedAt: "2024-12-09 18:45",
    tags: ["stage/ideation", "type/method"],
    references: ["personas-1"],
  },

  {
    id: "insp-3",
    title: "💡 SaaS 定价的心理学",
    type: "inspiration",
    content: `价格锚点效应：永远提供3个选项。

中间价格(推荐)的转化率最高,因为用户倾向避免极端选择。

Pro Tip: 将企业版定价设为中间版的3-5倍,突显中间版的性价比。`,
    source: "《Predictably Irrational》",
    capturedAt: "2024-12-08 21:00",
    tags: ["stage/launch", "type/insight"],
    references: ["pricing-model"],
  },

  {
    id: "insp-4",
    title: "💡 AI 产品的护城河在哪里?",
    type: "inspiration",
    content: `大模型会越来越便宜,技术不是壁垒。

真正的护城河：
- 独特的数据飞轮(用户使用→数据积累→产品改进→吸引更多用户)
- 深度的工作流整合(让用户离不开)
- 强大的社区和网络效应

提问：CrossMind 的数据飞轮是什么？`,
    source: "Podcast: a16z - The AI Moat",
    capturedAt: "2024-12-07 14:20",
    tags: ["stage/design", "type/question"],
    references: ["feature-canvas"],
  },

  {
    id: "insp-5",
    title: "💡 为什么 Notion 成功了?",
    type: "inspiration",
    content: `Notion 的成功不是因为功能最强,而是：

1. **极致的灵活性** - Block 系统让用户自己定义工作流
2. **美观的设计** - 让工作变得有趣
3. **病毒式传播** - 免费版足够好用,用户主动推荐

教训: 不要试图取代 Notion,而是找到它做不好的细分场景。`,
    source: "Case Study: How Notion Grew",
    capturedAt: "2024-12-06 10:15",
    tags: ["stage/ideation", "type/case-study"],
    references: ["competitor-1"],
  },
];

// ============================================
// Layout Configuration (for dynamic calculation in browser)
// ============================================

export const NODE_WIDTH = 320;
export const VERTICAL_GAP = 40; // Gap between nodes vertically
export const COLUMN_GAP = 80; // Gap between columns

export interface ZoneConfig {
  startX: number;
  columnCount: number;
  nodeIds: string[];
}

export const ZONE_CONFIGS: Record<string, ZoneConfig> = {
  ideation: { startX: 20, columnCount: 2, nodeIds: ["vision-1", "competitor-1", "personas-1", "journey-1", "idea-github", "insp-1", "insp-2", "insp-5"] },
  design: { startX: 840, columnCount: 2, nodeIds: ["prd-1", "feature-canvas", "feature-canvas-ai", "feature-task", "feature-task-collab", "design-system", "onboarding-1", "insp-4"] },
  dev: { startX: 1660, columnCount: 2, nodeIds: ["arch-1", "arch-frontend", "arch-backend", "task-canvas-impl", "task-ai-integration", "ai-integration"] },
  launch: { startX: 2480, columnCount: 2, nodeIds: ["launch-plan", "marketing-strategy", "pricing-model", "insp-3"] },
};

// Helper to get all node contents (without layout - layout will be calculated in browser)
export function getAllNodeContents() {
  return NODE_CONTENTS;
}

// ============================================
// Activity & Comments Data
// ============================================

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
      type: "created",
      user: "Alex",
      timestamp: "2024-12-08 16:20",
      description: "创建了此任务",
    },
  ],
  "vision-1": [
    {
      id: "feed-4",
      type: "updated",
      user: "Alex",
      timestamp: "2024-12-09 11:45",
      description: "更新了产品愿景文档",
    },
    {
      id: "feed-5",
      type: "created",
      user: "Sarah",
      timestamp: "2024-12-08 10:00",
      description: "创建了此文档",
    },
  ],
};

export const MOCK_COMMENTS: { [key: string]: Comment[] } = {
  "task-canvas-impl": [
    {
      id: "comment-1",
      user: "Sarah",
      content: "@Alex Canvas 拖拽功能进展如何？",
      timestamp: "2024-12-09 12:15",
      mentions: ["Alex"],
    },
    {
      id: "comment-2",
      user: "Alex",
      content: "拖拽基本完成，节点引用跳转功能还在调试",
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
  ],
};

export const MOCK_SUGGESTIONS: AISuggestion[] = [
  {
    id: "sug-1",
    type: "add-node",
    title: "建议添加「用户反馈收集」节点",
    description: "在 Launch 阶段缺少用户反馈机制",
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

// Re-export for compatibility
export type CanvasNode = NodeContent & { position: { x: number; y: number } };
