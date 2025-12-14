# Canvas API Client

统一的 Canvas API 客户端，用于管理所有 Canvas 相关的 API 调用。

## 📁 文件结构

```
lib/api/
├── canvas-api.ts           # 核心 API 客户端 (261 行)
├── CANVAS_API_USAGE.md     # 使用指南
├── MIGRATION_EXAMPLE.md    # 迁移示例
└── README.md               # 本文件
```

## ✨ 功能特性

### 1. 统一的 API 接口

```typescript
import { canvasApi } from "@/lib/api/canvas-api";

// 节点操作
await canvasApi.nodes.create(data);
await canvasApi.nodes.update(nodeId, updates);
await canvasApi.nodes.delete(nodeId);
await canvasApi.nodes.hide(nodeId, frameworkId);
await canvasApi.nodes.restore(nodeId, frameworkId);
await canvasApi.nodes.moveToZone(nodeId, frameworkId, zoneKey);

// AI 建议
await canvasApi.suggestions.generate(params, signal);
await canvasApi.suggestions.apply(suggestionId);
await canvasApi.suggestions.dismiss(suggestionId);

// 位置管理
await canvasApi.positions.save(projectId, frameworkId, positions);

// Zone 亲和度
await canvasApi.affinities.update(nodeId, frameworkId, zoneKey, value);
```

### 2. 统一的错误处理

```typescript
import { ApiError } from "@/lib/api/canvas-api";

try {
  await canvasApi.nodes.delete(nodeId);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.status, error.data);
  }
}
```

### 3. TypeScript 类型安全

所有 API 方法都有完整的类型定义：

```typescript
export interface CreateNodeData {
  projectId: string;
  title: string;
  content: string;
  type: "document" | "idea" | "task" | "inspiration";
  parentId?: string;
  zoneAffinities?: Record<string, Record<string, number>>;
  displayOrder?: number;
}
```

## 📊 当前状态

### 已完成 ✅

- [x] 创建统一的 API 客户端 ([canvas-api.ts](canvas-api.ts))
- [x] 完整的 TypeScript 类型定义
- [x] 统一的错误处理 (ApiError)
- [x] 使用文档 ([CANVAS_API_USAGE.md](CANVAS_API_USAGE.md))
- [x] 迁移示例 ([MIGRATION_EXAMPLE.md](MIGRATION_EXAMPLE.md))
- [x] TypeScript 编译验证通过

### 已完成迁移 ✅

所有 **15 个 API 调用**已迁移到使用新的客户端：

**app/(crossmind)/canvas/page.tsx** (6 个)
- [x] applySuggestion - Line 453
- [x] dismissSuggestion - Line 501
- [x] generateSuggestions - Line 542
- [x] handleDelete - Line 609
- [x] handleHideNode - Line 669
- [x] handleRestoreNode - Line 712

**app/(crossmind)/canvas/hooks/useCanvasNodeOperations.ts** (3 个)
- [x] handleDelete - Line 51
- [x] handleHideNode - Line 141
- [x] handleRestoreNode - Line 197

**app/(crossmind)/canvas/hooks/useCanvasSuggestions.ts** (3 个)
- [x] handleGenerateSuggestions - Line 77
- [x] handleApplySuggestion - Line 114
- [x] handleDismissSuggestion - Line 174

**app/(crossmind)/canvas/hooks/useCanvasDragDrop.ts** (3 个)
- [x] Update parentId - Line 102
- [x] Update displayOrder/parentId - Line 255
- [x] Update node (drag-drop) - Line 372

## 📈 预期收益

迁移完成后：

| 指标 | 改进 |
|------|------|
| **代码量** | -150 行重复的 fetch 逻辑 |
| **错误处理** | 统一的 ApiError 类型 |
| **可维护性** | API 变更只需修改一处 |
| **类型安全** | 完整的 TypeScript 支持 |
| **可测试性** | 易于 mock 和单元测试 |

## 🚀 快速开始

### 1. 导入 API 客户端

```typescript
import { canvasApi, ApiError } from "@/lib/api/canvas-api";
```

### 2. 替换现有的 fetch 调用

**迁移前:**
```typescript
const response = await fetch(`/api/canvas/${nodeId}`, {
  method: "DELETE",
});
if (!response.ok) {
  throw new Error("Failed to delete node");
}
```

**迁移后:**
```typescript
await canvasApi.nodes.delete(nodeId);
```

### 3. 更新错误处理

```typescript
try {
  await canvasApi.nodes.delete(nodeId);
} catch (error) {
  if (error instanceof ApiError) {
    console.error("API Error:", error.message, error.status);
  }
}
```

## 📚 文档

- **使用指南**: [CANVAS_API_USAGE.md](CANVAS_API_USAGE.md)
  - API 方法完整列表
  - 使用示例
  - 错误处理
  - React Hook 集成

- **迁移示例**: [MIGRATION_EXAMPLE.md](MIGRATION_EXAMPLE.md)
  - 实际迁移示例（4 个）
  - 迁移前后对比
  - 迁移清单
  - 迁移步骤

## 🔧 API 分组

### nodes (节点操作)
- `create()` - ��建节点
- `update()` - 更新节点
- `delete()` - 删除节点
- `hide()` - 隐藏节点
- `restore()` - 恢复节点
- `moveToZone()` - 移动到 Zone

### suggestions (AI 建议)
- `generate()` - 生成建议
- `apply()` - 应用建议
- `dismiss()` - 忽略建议

### positions (位置管理)
- `save()` - 保存位置

### affinities (Zone 亲和度)
- `update()` - 更新亲和度

## 🎯 下一步

1. **逐步迁移**: 从 page.tsx 开始，逐个文件迁移
2. **测试验证**: 每个迁移后都要测试功能正常
3. **清理旧代码**: 移除重复的 fetch 逻辑
4. **性能优化**: 考虑添加请求去重、重试机制等

## 💡 设计原则

1. **单一职责**: 每个方法只负责一个 API 调用
2. **统一接口**: 所有方法返回 Promise
3. **错误优先**: 统一的错误处理
4. **类型安全**: 完整的 TypeScript 类型
5. **易于扩展**: 添加新 API 只需添加新方法

## 🔍 示例：完整工作流

```typescript
import { canvasApi, ApiError } from "@/lib/api/canvas-api";
import { mutate } from "swr";

// 创建节点
try {
  const node = await canvasApi.nodes.create({
    projectId: "xxx",
    title: "New Node",
    content: "Content",
    type: "document"
  });

  // 移动到 Zone
  await canvasApi.nodes.moveToZone(
    node.id,
    "lean-canvas",
    "problem"
  );

  // 更新亲和度
  await canvasApi.affinities.update(
    node.id,
    "lean-canvas",
    "solution",
    0.5
  );

  // 刷新数据
  await mutate(`/api/canvas?projectId=xxx`);

} catch (error) {
  if (error instanceof ApiError) {
    console.error("Operation failed:", error.message);
  }
}
```

---

**创建日期**: 2025-12-14
**版本**: 1.0.0
**状态**: ✅ 已完成 - 迁移完成 (15/15)
