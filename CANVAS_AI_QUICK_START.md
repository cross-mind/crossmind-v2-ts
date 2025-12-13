# Canvas AI 快速开始指南

## 🚀 立即测试

### 1. 访问 Canvas 页面

```
http://localhost:8000/canvas
```

如果重定向到登录页,点击 "Continue as Guest"

### 2. 创建或选择项目

- 如果没有项目,先创建一个
- 进入 Canvas 页面后,应该看到节点画布

### 3. 测试 AI 对话

1. **点击任意节点** → 右侧打开详情面板
2. **点击 "AI Chat" 标签** → 激活 AI 聊天
3. **等待加载** → 应该显示完整的聊天界面

### 4. 测试消息示例

#### 基础对话
```
你好,请介绍一下你能做什么?
```

#### 创建节点
```
请创建一个新的idea节点,标题是"用户反馈系统",内容是"收集和管理用户反馈的功能模块"
```

#### 更新当前节点
```
请把当前节点的内容扩展,添加更多细节
```

#### 删除节点
```
请删除ID为xxx的节点
```

## 🔍 验证功能

### 检查会话创建

打开浏览器开发者工具 (F12):

1. **Network 标签** → 查看 API 请求:
   - `GET /api/canvas/chat-session?nodeId=xxx` - 会话初始化
   - `POST /api/canvas/chat` - 发送消息

2. **Console 标签** → 查看日志:
   - `[Canvas API]` - API 端点日志
   - `[SWR Hook]` - 数据获取日志

### 检查数据库

```sql
-- 查看 Canvas 节点的聊天会话
SELECT
  cs.id as session_id,
  cn.title as node_title,
  COUNT(m.id) as message_count
FROM "ChatSession" cs
JOIN "CanvasNode" cn ON cn.id = cs."canvasNodeId"
LEFT JOIN "Message_v2" m ON m."chatId" = cs.id
WHERE cs."canvasNodeId" IS NOT NULL
GROUP BY cs.id, cn.title;
```

## ⚡ 功能亮点

### ✅ 已实现

- **流式响应**: 实时看到 AI 生成的文字
- **图片上传**: 点击 📎 上传图片,AI 可以分析
- **会话持久化**: 刷新页面后对话历史保留
- **工具调用**: AI 可以创建、更新、删除节点
- **上下文感知**: AI 知道当前节点的内容和项目信息

### 🔧 AI 工具

- `createNode`: 创建新节点
- `updateNode`: 更新节点内容/标题/标签/类型
- `deleteNode`: 删除节点(需确认)

## 📝 关键文件位置

- **会话管理 API**: `app/api/canvas/chat-session/route.ts`
- **聊天 API**: `app/api/canvas/chat/route.ts`
- **AI 工具**: `lib/ai/tools/canvas/`
- **系统提示**: `lib/ai/prompts/canvas-prompt.ts`
- **Chat 组件**: `components/chat.tsx`
- **NodeDetailPanel**: `app/(crossmind)/canvas/components/NodeDetailPanel.tsx`

## 🎯 测试检查清单

- [ ] 能打开节点的 AI Chat 标签
- [ ] 能看到 "Loading chat session..." 然后加载聊天界面
- [ ] 能发送消息并收到 AI 回复
- [ ] AI 回复是流式输出(逐字显示)
- [ ] 能上传图片并让 AI 分析
- [ ] 能要求 AI 创建新节点
- [ ] 能要求 AI 更新当前节点
- [ ] 刷新页面后对话历史保留

## ⚠️ 常见问题

### 问题: "Loading chat session..." 一直不消失

**可能原因**:
- API 请求失败
- 数据库连接问题
- 节点不存在

**检查**:
1. 打开浏览器开发者工具
2. 查看 Network 标签的 chat-session 请求
3. 查看 Console 是否有错误

### 问题: AI 不回复

**可能原因**:
- AI Gateway 未配置
- 模型 ID 错误
- API 请求失败

**检查**:
1. 查看 Console 是否有错误
2. 查看 Network 标签的 /api/canvas/chat 请求
3. 确认环境变量 AI_GATEWAY_API_KEY 已设置

### 问题: 工具调用不生效

**可能原因**:
- 数据库写入失败
- 权限不足
- 节点 ID 错误

**检查**:
1. 查看 AI 的回复中是否提到工具调用成功
2. 检查数据库是否有新记录
3. 刷新 Canvas 页面查看是否有新节点

## 🎉 开始测试吧!

服务器运行在: **http://localhost:8000**

祝测试顺利! 🚀
