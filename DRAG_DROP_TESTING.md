# Canvas 节点拖放功能测试指南

## 🎯 功能概述

Canvas 节点现在支持拖放操作，可以：
1. **调整节点排序** - 在同一区域内重新排列节点
2. **建立层级关系** - 将节点拖到另一个节点上成为其子节点
3. (未来) **调整区域归属** - 将节点拖到不同框架区域

## 🧪 测试步骤

### 1. 访问 Canvas 页面

打开浏览器访问：
```
http://localhost:8000/canvas?projectId=cfdd5092-ab38-4612-a1c2-4d3342ee0444
```

### 2. 查看拖动手柄

- **鼠标悬停**在任意节点卡片上
- 应该在卡片**左上角**看到一个拖动手柄图标（六个点的图标）
- 手柄应该是**半透明背景**，hover 时背景变深

### 3. 测试节点排序（同级重排）

#### 操作：
1. 点击并按住左上角的拖动手柄
2. 拖动到另一个节点的**上边缘**（卡片顶部 25% 区域）
3. 应该看到**蓝色指示线**出现在目标节点上方
4. 松开鼠标

#### 预期结果：
- ✅ 被拖动的节点会插入到目标节点**前面**
- ✅ 页面自动刷新，显示新的顺序
- ✅ Toast 提示显示 "Node moved"

#### 或者拖到下边缘：
1. 拖动到另一个节点的**下边缘**（卡片底部 25% 区域）
2. 应该看到**蓝色指示线**出现在目标节点下方
3. 松开鼠标

#### 预期结果：
- ✅ 被拖动的节点会插入到目标节点**后面**

### 4. 测试建立父子关系

#### 操作：
1. 点击并按住左上角的拖动手柄
2. 拖动到另一个节点的**中心区域**（卡片中间 50% 区域）
3. 应该看到目标节点出现**蓝色高亮边框**（ring-2 ring-primary）
4. 松开鼠标

#### 预期结果：
- ✅ 被拖动的节点成为目标节点的**子节点**
- ✅ 子节点会显示在父节点下方的嵌套列表中
- ✅ Toast 提示显示 "Node moved"
- ✅ 页面自动刷新

### 5. 测试循环引用防护

#### 操作：
1. 找到一个有子节点的父节点
2. 尝试将**父节点**拖到它的**子节点**上（成为子节点的子节点）
3. 松开鼠标

#### 预期结果：
- ✅ Toast 显示错误提示 "Cannot create circular hierarchy"
- ✅ 节点位置不变，操作被拒绝

### 6. 测试拖动视觉反馈

#### 拖动过程中应该看到：
- ✅ 被拖动的节点变为**半透明** (opacity-50)
- ✅ 被拖动的节点略微**缩小** (scale-95)
- ✅ 光标变为 **cursor-grabbing**
- ✅ 目标位置显示**蓝色指示线**或**高亮边框**

## 🐛 常见问题排查

### 问题 1: 看不到拖动手柄
**检查：**
- 确保鼠标悬停在卡片上
- 检查浏览器控制台是否有 JavaScript 错误
- 确认 `@dnd-kit/core` 已安装：`pnpm list @dnd-kit/core`

### 问题 2: 拖动没有反应
**检查：**
1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 检查 Network 标签，确认 PATCH 请求是否发送
4. 确认必须拖动**至少 8px** 才会触发拖动（防止误触）

### 问题 3: 拖动后页面没有更新
**检查：**
1. 检查浏览器控制台 Network 标签
2. 确认 API 请求返回 200 状态码
3. 检查 displayOrder 字段是否存在：
   ```bash
   npx tsx scripts/test-display-order.ts
   ```

### 问题 4: 拖动后位置不对
**原因：** 当前使用 `window.location.reload()` 刷新页面
**未来优化：** 将改用 SWR `mutate()` 实现乐观更新

## 📊 数据库验证

### 检查 displayOrder 字段
```bash
npx tsx scripts/test-display-order.ts
```

### 检查节点的 parentId
```sql
SELECT id, title, "parentId", "displayOrder"
FROM "CanvasNode"
WHERE "projectId" = 'cfdd5092-ab38-4612-a1c2-4d3342ee0444'
ORDER BY "displayOrder";
```

## 🔧 调试技巧

### 1. 查看拖放事件
在浏览器控制台输入：
```javascript
window.addEventListener('drag', (e) => console.log('Drag event:', e));
```

### 2. 检查 DndContext
在 Canvas 页面的 React DevTools 中：
- 找到 `DndContext` 组件
- 查看 props 中的 `onDragStart`, `onDragOver`, `onDragEnd`
- 确认这些函数都已正确绑定

### 3. 查看节点状态
```javascript
// 在控制台查看所有节点的 data-node-id
document.querySelectorAll('[data-node-id]').forEach(el => {
  console.log(el.getAttribute('data-node-id'));
});
```

## ✅ 成功标志

如果以下所有测试都通过，说明拖放功能正常工作：
- [ ] 能看到拖动手柄（hover 时显示）
- [ ] 能拖动节点到其他节点上方/下方（显示蓝色指示线）
- [ ] 能拖动节点到其他节点中心（显示高亮边框）
- [ ] 拖动后节点顺序改变
- [ ] 拖动后建立了父子关系
- [ ] 循环引用被正确拒绝
- [ ] 所有操作后显示 toast 提示

## 🚀 下一步优化

1. **乐观更新** - 用 SWR mutate 替代 reload
2. **区域拖放** - 支持拖到空白区域改变 zoneAffinities
3. **批量操作** - 支持选中多个节点一起拖动
4. **撤销/重做** - 实现操作历史
5. **动画优化** - 添加平滑的位置变化动画
