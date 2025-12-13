# Bug Fix: Canvas AI 聊天导致页面刷新

## 🐛 问题描述

**症状**: 在 Canvas 页面选择节点，打开 AI Chat 标签发送消息后，页面刷新并跳转回"没有项目"的提示页。

**影响**: Canvas AI 功能完全无法使用

**根本原因**: Chat 组件中有多个只适用于全页面模式的逻辑，在 panel 模式下也被执行，导致 URL 改变和页面刷新。

## 🔍 问题分析

### 问题 1: Query 参数处理导致 URL 替换

**位置**: `components/chat.tsx:193`

**原始代码**:
```typescript
useEffect(() => {
  if (query && !hasAppendedQuery) {
    sendMessage({
      role: "user" as const,
      parts: [{ type: "text", text: query }],
    });

    setHasAppendedQuery(true);
    window.history.replaceState({}, "", `/chat/${id}`);  // ❌ 问题
  }
}, [query, sendMessage, hasAppendedQuery, id]);
```

**问题**:
- 这行代码会将 URL 从 `/canvas?projectId=xxx` 替换为 `/chat/session-id`
- 导致 Canvas 页面的 `projectId` 参数丢失
- Canvas 页面检测不到 `projectId` 后显示"没有项目"提示

**修复**:
```typescript
useEffect(() => {
  // Only handle query parameter in full-page mode (not in panel mode for Canvas)
  if (query && !hasAppendedQuery && mode === "full-page") {
    sendMessage({
      role: "user" as const,
      parts: [{ type: "text", text: query }],
    });

    setHasAppendedQuery(true);
    window.history.replaceState({}, "", `/chat/${id}`);
  }
}, [query, sendMessage, hasAppendedQuery, id, mode]);
```

### 问题 2: Popstate 事件导致页面刷新

**位置**: `components/chat.tsx:97`

**原始代码**:
```typescript
useEffect(() => {
  const handlePopState = () => {
    // When user navigates back/forward, refresh to sync with URL
    router.refresh();  // ❌ 可能导致问题
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, [router]);
```

**问题**:
- 在 panel 模式下不应该监听浏览器历史事件
- `router.refresh()` 可能导致页面重新加载

**修复**:
```typescript
useEffect(() => {
  if (mode !== "full-page") {
    return;
  }

  const handlePopState = () => {
    // When user navigates back/forward, refresh to sync with URL
    router.refresh();
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, [router, mode]);
```

### 问题 3: onFinish 的 mutate 可能引起副作用

**位置**: `components/chat.tsx:167`

**原始代码**:
```typescript
onFinish: () => {
  mutate(unstable_serialize(getChatHistoryPaginationKey));
},
```

**问题**:
- `getChatHistoryPaginationKey` 是为聊天历史列表设计的
- 在 Canvas panel 模式下不应该刷新聊天历史列表

**修复**:
```typescript
onFinish: () => {
  // Only mutate chat history in full-page mode (not in Canvas panel mode)
  if (mode === "full-page") {
    mutate(unstable_serialize(getChatHistoryPaginationKey));
  }
},
```

## ✅ 修复总结

### 修改文件

- `components/chat.tsx` (3处修改)

### 修改内容

1. **Query 参数处理**: 添加 `mode === "full-page"` 条件检查
2. **Popstate 监听器**: 添加 early return for panel mode
3. **onFinish mutate**: 添加 mode 条件检查

### 向后兼容性

- ✅ 所有修改都向后兼容
- ✅ 全页面聊天功能不受影响
- ✅ 只影响 panel 模式（Canvas AI）的行为

## 🧪 验证步骤

### 测试 Canvas AI

1. 访问 Canvas 页面: `http://localhost:8000/canvas?projectId=xxx`
2. 点击任意节点
3. 切换到 "AI Chat" 标签
4. 发送消息: "你好"
5. **预期**:
   - ✅ 消息成功发送
   - ✅ AI 正常回复
   - ✅ URL 保持为 `/canvas?projectId=xxx`
   - ✅ 页面不刷新或跳转

### 测试全页面聊天

1. 访问聊天页面: `http://localhost:8000/chat`
2. 创建新对话
3. 发送消息
4. **预期**:
   - ✅ 消息成功发送
   - ✅ AI 正常回复
   - ✅ 聊天历史正常更新
   - ✅ URL 管理正常

## 📊 影响范围

### 影响的组件

- `components/chat.tsx` - 主要修改
- `app/(crossmind)/canvas/components/NodeDetailPanel.tsx` - 使用修复后的 Chat 组件

### 不受影响

- `app/(chat)/page.tsx` - 全页面聊天功能完全不受影响
- 其他使用 Chat 组件的地方（如果有）需要确认 mode 参数

## 🎯 后续建议

### 短期

1. 测试其他可能使用 Chat 组件的地方
2. 添加更多错误处理和日志
3. 考虑在 panel 模式下完全禁用某些功能

### 长期

1. 考虑将 Chat 组件拆分为两个独立组件：
   - `ChatPage` - 全页面模式
   - `ChatPanel` - 嵌入式面板模式
2. 添加自动化测试防止回归
3. 改进错误提示，让用户知道发生了什么

## ✨ 测试清单

完成修复后，请验证以下功能：

### Canvas AI (panel 模式)

- [ ] 能打开 AI Chat 标签
- [ ] 能发送消息
- [ ] AI 能正常回复
- [ ] URL 不改变
- [ ] 页面不刷新
- [ ] 刷新页面后对话历史保留
- [ ] 能上传图片
- [ ] AI 工具调用正常

### 全页面聊天

- [ ] 能创建新对话
- [ ] 能发送消息
- [ ] AI 能正常回复
- [ ] 聊天历史列表更新
- [ ] URL 管理正常
- [ ] 能上传图片

## 🎉 修复完成

此 bug 已修复，Canvas AI 功能现在应该可以正常使用了！

**修复时间**: 2025-12-13
**修复者**: Claude
**测试状态**: 待用户验证

---

如遇到任何问题，请检查浏览器控制台是否有错误日志。
