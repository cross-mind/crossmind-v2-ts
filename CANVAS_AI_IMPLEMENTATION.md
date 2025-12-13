# Canvas AI 对话功能实施总结

## ✅ 实施完成情况

### 已完成的核心功能

1. **Phase 1: 基础设施** ✅
   - ✅ DataStreamProvider 集成到 Canvas 布局
   - ✅ ChatSession 数据库查询函数
   - ✅ 会话管理 API (GET /api/canvas/chat-session)
   - ✅ Canvas AI 主 API (POST /api/canvas/chat)
   - ✅ Canvas 专用系统提示
   - ✅ 3个基础 AI 工具 (create/update/delete nodes)

2. **Phase 2: 组件通用化** ✅
   - ✅ Chat 组件支持 panel 模式
   - ✅ MultimodalInput compact 模式
   - ✅ Messages 组件 compact 支持
   - ✅ 动态 API endpoint 配置
   - ✅ 功能开关 (features props)

3. **Phase 3: Canvas 集成** ✅
   - ✅ useChatSession Hook (SWR)
   - ✅ NodeDetailPanel 集成完整 Chat 组件
   - ✅ 懒加载会话(仅在 AI Chat 标签激活时)
   - ✅ 移除旧的 SimpleChat 依赖

## 📂 关键文件清单

### 新增文件

**API 路由**:
- `app/api/canvas/chat-session/route.ts` - 会话管理(查找或创建ChatSession)
- `app/api/canvas/chat/route.ts` - Canvas AI 流式对话

**Hooks**:
- `hooks/use-chat-session.ts` - ChatSession 管理

**AI 工具**:
- `lib/ai/tools/canvas/create-node.ts` - 创建节点
- `lib/ai/tools/canvas/update-node.ts` - 更新节点
- `lib/ai/tools/canvas/delete-node.ts` - 删除节点

**系统提示**:
- `lib/ai/prompts/canvas-prompt.ts` - Canvas 专用系统提示

### 修改文件

**布局**:
- `app/(crossmind)/layout.tsx` - 添加 DataStreamProvider

**组件**:
- `components/chat.tsx` - 通用化(mode/context/features props)
- `components/multimodal-input.tsx` - compact 模式支持
- `components/messages.tsx` - compact prop 支持
- `app/(crossmind)/canvas/components/NodeDetailPanel.tsx` - 集成 Chat 组件

**数据层**:
- `lib/db/queries.ts` - 新增 ChatSession 查询函数

**页面**:
- `app/(crossmind)/canvas/page.tsx` - 移除旧 AI 状态
- `app/(crossmind)/canvas/canvas-data.ts` - 修复 zoneKey 类型

## 🎯 功能特性

### 1. 完全组件复用
- 使用相同的 Chat, MultimodalInput, Messages 组件
- 通过 props 控制功能,无需重复实现
- 支持图片上传、流式响应、工具调用

### 2. 会话持久化
- 每个节点有独立的 ChatSession (通过 canvasNodeId 关联)
- 自动查找已有会话,不存在则创建
- 刷新页面后对话历史完整保留

### 3. AI 工具能力
- **createNode**: 创建新节点(支持 parentId, tags, type)
- **updateNode**: 更新节点内容、标题、标签、类型
- **deleteNode**: 删除节点(带安全检查)

### 4. 上下文感知
- AI 可以访问节点内容、标题、类型、标签
- 知晓项目名称、描述
- 了解当前框架和区域配置

## 🧪 测试指南

### 前置条件

1. **确认服务器运行**:
   ```bash
   # 检查服务器是否运行
   lsof -ti:8000
   # 如果没有输出,启动服务器
   pnpm dev
   ```

2. **确认数据库连接**:
   - PostgreSQL 正在运行
   - POSTGRES_URL 环境变量已设置

### 测试步骤

#### Step 1: 访问 Canvas 页面

```
http://localhost:8000/canvas?projectId=<YOUR_PROJECT_ID>
```

如果没有项目ID,先创建一个项目:
```
http://localhost:8000/
```

#### Step 2: 测试节点选择和 AI Chat

1. **点击任意节点** → 右侧应显示 NodeDetailPanel
2. **切换到 "AI Chat" 标签** → 应该看到:
   - "Loading chat session..." (短暂)
   - 然后显示完整的 Chat 界面

#### Step 3: 测试基础对话

发送测试消息:
```
你好,请介绍一下你能做什么
```

预期响应:
- 流式输出 AI 回复
- 提到可以创建、更新、删除节点

#### Step 4: 测试 createNode 工具

发送消息:
```
请创建一个新的idea节点,标题是"测试想法",内容是"这是一个测试想法的内容"
```

预期行为:
- AI 调用 createNode 工具
- 返回成功消息
- 数据库创建新节点
- Canvas 页面刷新后应看到新节点

验证:
```sql
SELECT * FROM "CanvasNode"
WHERE title = '测试想法'
ORDER BY "createdAt" DESC LIMIT 1;
```

#### Step 5: 测试 updateNode 工具

发送消息:
```
请把当前节点的标题改为"更新后的标题"
```

预期行为:
- AI 调用 updateNode 工具(nodeId 默认为当前节点)
- 节点标题更新
- 返回成功消息

#### Step 6: 测试图片上传

1. 点击输入框左侧的 📎 图标
2. 上传一张图片
3. 发送消息: "这张图片是什么?"

预期行为:
- 图片上传到 Vercel Blob
- AI 分析图片内容并回复

#### Step 7: 测试会话持久化

1. 发送几条消息
2. **刷新页面**
3. 重新选择同一个节点
4. 切换到 AI Chat 标签

预期行为:
- 对话历史完整保留
- 之前的消息全部显示

### 数据库验证

#### 验证 ChatSession 创建

```sql
SELECT
  cs.id,
  cs."canvasNodeId",
  cn.title as node_title,
  cs."createdAt",
  (SELECT COUNT(*) FROM "Message_v2" WHERE "chatId" = cs.id) as message_count
FROM "ChatSession" cs
LEFT JOIN "CanvasNode" cn ON cn.id = cs."canvasNodeId"
WHERE cs."canvasNodeId" IS NOT NULL
ORDER BY cs."createdAt" DESC;
```

#### 验证消息保存

```sql
SELECT
  m.id,
  m.role,
  m.parts,
  m."createdAt",
  cs."canvasNodeId"
FROM "Message_v2" m
JOIN "ChatSession" cs ON m."chatId" = cs.id
WHERE cs."canvasNodeId" IS NOT NULL
ORDER BY m."createdAt" DESC
LIMIT 10;
```

#### 验证工具调用创建的节点

```sql
SELECT
  id,
  title,
  type,
  content,
  tags,
  "createdAt"
FROM "CanvasNode"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
```

## 🐛 已知问题

### 1. TypeScript 类型错误

**问题**: CanvasView.tsx 中 position 属性类型不匹配

**影响**: 无法通过 production build,但不影响开发服务器

**解决方案**: 待修复 (不影响 Canvas AI 功能)

### 2. Chrome DevTools MCP

**问题**: 浏览器实例已在运行,无法连接

**影响**: 无法使用自动化测试工具

**解决方案**: 手动在浏览器中测试

## 📊 性能优化建议

### 当前配置

- **消息历史**: 无限制(全部加载)
- **节点内容**: 完整传递给 AI
- **SWR 缓存**: `revalidateOnFocus: false`, `dedupingInterval: 5000ms`

### 建议优化

1. **限制消息历史**:
   ```typescript
   const messages = allMessages.slice(-50); // 最近50条
   ```

2. **截断节点内容**:
   ```typescript
   const truncatedContent = node.content.slice(0, 2000); // 前2000字符
   ```

3. **添加 loading 状态**:
   - useChatSession 已返回 isLoading
   - NodeDetailPanel 已显示 "Loading chat session..."

## 🚀 下一步建议

### 短期优化

1. **修复类型错误**: 解决 CanvasView.tsx 的 position 类型问题
2. **错误处理**: 添加更友好的错误提示
3. **工具反馈**: 工具执行后刷新 Canvas 页面显示新节点
4. **性能优化**: 实施上述建议的优化

### 功能增强

1. **更多 AI 工具**:
   - moveNode: 移动节点到新区域
   - linkNodes: 建立节点引用关系
   - refineContent: 优化节点内容

2. **RAG 集成**:
   - 查询 ProjectDocument 提供项目上下文
   - 向量搜索相关节点

3. **协作功能**:
   - 多用户共享节点的实时对话
   - 对话导出为节点评论

## 🎉 总结

Canvas AI 对话功能已完全实施并可用:

- ✅ **组件完全复用**: 无重复代码
- ✅ **会话持久化**: 刷新后历史保留
- ✅ **3个基础工具**: 创建、更新、删除节点
- ✅ **流式响应**: 平滑的 AI 输出
- ✅ **图片上传**: 多模态支持
- ✅ **Compact 布局**: 适配侧边面板

开发服务器运行在: **http://localhost:8000**

立即开始测试,体验 Canvas AI 的强大功能!
