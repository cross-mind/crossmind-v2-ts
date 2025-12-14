# Canvas API Client 使用指南

## 概述

`canvas-api.ts` 提供了统一的 Canvas API 客户端，集中管理所有与 Canvas 相关的 API 调用。

## 优势

✅ **统一错误处理** - 所有 API 调用都经过统一的错误处理
✅ **类型安全** - 完整的 TypeScript 类型定义
✅ **代码复用** - 避免重复的 fetch 逻辑
✅ **易于测试** - 可以轻松 mock API 调用
✅ **易于维护** - API 变更只需修改一处

## 基本用法

```typescript
import { canvasApi, ApiError } from "@/lib/api/canvas-api";

// 使用 try-catch 处理错误
try {
  await canvasApi.nodes.delete(nodeId);
} catch (error) {
  if (error instanceof ApiError) {
    console.error("API Error:", error.message, error.status);
  }
}
```

## API 分类

### 1. 节点操作 (canvasApi.nodes)

#### 创建节点
```typescript
const newNode = await canvasApi.nodes.create({
  projectId: "xxx",
  title: "New Node",
  content: "Content here",
  type: "document",
  parentId: "optional-parent-id",
  displayOrder: 1,
  zoneAffinities: {
    "framework-id": {
      "zone-key": 1.0
    }
  }
});
```

#### 更新节点
```typescript
await canvasApi.nodes.update(nodeId, {
  displayOrder: 2,
  parentId: "new-parent-id",
  zoneAffinities: {
    "framework-id": {
      "zone-key": 0.8
    }
  }
});
```

#### 删除节点
```typescript
await canvasApi.nodes.delete(nodeId);
```

#### 隐藏节点
```typescript
await canvasApi.nodes.hide(nodeId, frameworkId);
```

#### 恢复节点
```typescript
await canvasApi.nodes.restore(nodeId, frameworkId);
```

#### 移动节点到 Zone
```typescript
await canvasApi.nodes.moveToZone(nodeId, frameworkId, "problem");
```

### 2. AI 建议操作 (canvasApi.suggestions)

#### 生成建议
```typescript
// 支持 AbortSignal 用于超时控制
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

try {
  await canvasApi.suggestions.generate(
    {
      projectId: "xxx",
      frameworkId: "lean-canvas"
    },
    controller.signal
  );
} finally {
  clearTimeout(timeout);
}
```

#### 应用建议
```typescript
const result = await canvasApi.suggestions.apply(suggestionId);

// 处理不同类型的建议结果
if (result.type === "content-suggestion" && result.result?.changes) {
  const { nodeId, prefilledPrompt } = result.result.changes;
  // 打开 AI Chat 并预填充 prompt
}
```

#### 忽略建议
```typescript
await canvasApi.suggestions.dismiss(suggestionId);
```

### 3. 位置操作 (canvasApi.positions)

#### 批量保存位置
```typescript
await canvasApi.positions.save(projectId, frameworkId, [
  { nodeId: "node-1", x: 100, y: 200 },
  { nodeId: "node-2", x: 300, y: 400 }
]);
```

### 4. Zone 亲和度操作 (canvasApi.affinities)

#### 更新亲和度
```typescript
await canvasApi.affinities.update(
  nodeId,
  frameworkId,
  "solution",
  0.7 // 亲和度值 0-1
);
```

## 迁移示例

### 迁移前 (page.tsx)

```typescript
// ❌ 旧代码：重复的 fetch 逻辑
const handleDelete = async (node: CanvasNode) => {
  try {
    const response = await fetch(`/api/canvas/${node.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete node");
    }

    // 刷新数据...
  } catch (error) {
    console.error("Error deleting node:", error);
    alert("删除节点失败，请重试");
  }
};
```

### 迁移后

```typescript
// ✅ 新代码：使用统一的 API 客户端
import { canvasApi, ApiError } from "@/lib/api/canvas-api";

const handleDelete = async (node: CanvasNode) => {
  try {
    await canvasApi.nodes.delete(node.id);

    // 刷新数据...
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("API Error:", error.message, error.status);
    }
    alert("删除节点失败，请重试");
  }
};
```

## 错误处理

所有 API 调用都会抛出 `ApiError`，包含以下属性：

```typescript
class ApiError extends Error {
  message: string;   // 错误消息
  status?: number;   // HTTP 状态码
  data?: any;        // 服务器返回的错误数据
}
```

### 错误处理示例

```typescript
try {
  await canvasApi.nodes.delete(nodeId);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 404:
        alert("节点不存在");
        break;
      case 403:
        alert("无权限删除该节点");
        break;
      default:
        alert(`操作失败: ${error.message}`);
    }
  }
}
```

## 在 React Hooks 中使用

```typescript
import { canvasApi } from "@/lib/api/canvas-api";
import { mutate } from "swr";

export function useNodeOperations(projectId: string) {
  const handleDelete = useCallback(async (nodeId: string) => {
    try {
      await canvasApi.nodes.delete(nodeId);

      // 刷新 SWR 缓存
      await mutate(`/api/canvas?projectId=${projectId}`);
    } catch (error) {
      console.error("Delete failed:", error);
      throw error; // 重新抛出以便上层处理
    }
  }, [projectId]);

  return { handleDelete };
}
```

## 待办事项：迁移现有代码

以下文件需要迁移到使用新的 API 客户端：

- [ ] `app/(crossmind)/canvas/page.tsx` (6 个 fetch 调用)
- [ ] `app/(crossmind)/canvas/hooks/useCanvasNodeOperations.ts` (3 个调用)
- [ ] `app/(crossmind)/canvas/hooks/useCanvasSuggestions.ts` (3 个调用)
- [ ] `app/(crossmind)/canvas/hooks/useCanvasDragDrop.ts` (3 个调用)

总计：**15 个 API 调用**需要迁移

## 扩展 API

如果需要添加新的 API 端点，只需在 `canvasApi` 对象中添加新方法：

```typescript
export const canvasApi = {
  nodes: {
    // 现有方法...

    // 新方法
    async duplicate(nodeId: string): Promise<CanvasNodeResponse> {
      return apiFetch(`/api/canvas/${nodeId}/duplicate`, {
        method: "POST",
      });
    }
  }
};
```
