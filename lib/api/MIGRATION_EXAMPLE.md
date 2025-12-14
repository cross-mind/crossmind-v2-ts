# Canvas API 迁移示例

## 示例 1: 删除节点 (page.tsx)

### 迁移前 ❌

```typescript
const handleDelete = async (node: CanvasNode) => {
  if (!confirm(`确定要删除节点"${node.title}"吗？这将同时删除其所有子节点。`)) {
    return;
  }

  // Close panel if the deleted node was selected
  if (selectedNode?.id === node.id) {
    setSelectedNode(null);
    setShowAIChat(false);
    updateUrl(null);
  }

  try {
    // ❌ 原始的 fetch 调用
    const response = await fetch(`/api/canvas/${node.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete node");
    }

    await mutate();
  } catch (error) {
    console.error("Error deleting node:", error);
    alert("删除节点失败，请重试");
  }
};
```

### 迁移后 ✅

```typescript
// 1. 在文件顶部添加 import
import { canvasApi, ApiError } from "@/lib/api/canvas-api";

const handleDelete = async (node: CanvasNode) => {
  if (!confirm(`确定要删除节点"${node.title}"吗？这将同时删除其所有子节点。`)) {
    return;
  }

  // Close panel if the deleted node was selected
  if (selectedNode?.id === node.id) {
    setSelectedNode(null);
    setShowAIChat(false);
    updateUrl(null);
  }

  try {
    // ✅ 使用统一的 API 客户端
    await canvasApi.nodes.delete(node.id);

    await mutate();
  } catch (error) {
    // ✅ 更好的错误处理
    if (error instanceof ApiError) {
      console.error("API Error:", error.message, error.status);
    } else {
      console.error("Error deleting node:", error);
    }
    alert("删除节点失败，请重试");
  }
};
```

**代码改进：**
- ✅ 减少 8 行代码 (从 24 行减少到 16 行)
- ✅ 移除了手动的 response.ok 检查
- ✅ 统一的错误处理类型
- ✅ 更清晰的 API 调用语义

---

## 示例 2: 移动节点到 Zone (page.tsx)

### 迁移前 ❌

```typescript
const handleMoveToZone = async (node: CanvasNode, targetZoneKey: string) => {
  if (!currentFramework) {
    console.error("[MoveToZone] No framework selected");
    return;
  }

  const zoneAffinities = {
    [currentFramework.id]: {
      [targetZoneKey]: 1.0,
    },
  };

  try {
    // ❌ 原始的 fetch 调用
    const response = await fetch(`/api/canvas/${node.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneAffinities }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[MoveToZone] API error:", errorData);
      throw new Error("Failed to move node to zone");
    }

    await mutate();
    if (currentFramework) {
      await mutateAffinities();
    }
  } catch (error) {
    console.error("[MoveToZone] Failed to move node:", error);
    alert("移动节点失败，请重试");
  }
};
```

### 迁移后 ✅

```typescript
const handleMoveToZone = async (node: CanvasNode, targetZoneKey: string) => {
  if (!currentFramework) {
    console.error("[MoveToZone] No framework selected");
    return;
  }

  try {
    // ✅ 使用统一的 API 客户端
    await canvasApi.nodes.moveToZone(node.id, currentFramework.id, targetZoneKey);

    await mutate();
    await mutateAffinities();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("[MoveToZone] API error:", error.message, error.status);
    }
    alert("移动节点失败，请重试");
  }
};
```

**代码改进：**
- ✅ 减少 15 行代码 (从 30 行减少到 15 行)
- ✅ 移除了手动的 JSON 序列化
- ✅ 移除了手动的 headers 设置
- ✅ 语义化的方法名 `moveToZone`

---

## 示例 3: AI 建议生成 (page.tsx)

### 迁移前 ❌

```typescript
const handleGenerateSuggestions = async () => {
  if (!projectId || !currentFramework || isGenerating) return;

  setIsGenerating(true);
  setElapsedTime(0);

  const startTime = Date.now();
  timerRef.current = setInterval(() => {
    setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
  }, 1000);

  const timeoutId = setTimeout(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsGenerating(false);
    console.error("[Canvas] Suggestion generation timed out after 60 seconds");
  }, 60000);

  try {
    // ❌ 原始的 fetch 调用
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 60000);

    const response = await fetch("/api/canvas/suggestions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        frameworkId: currentFramework.id,
      }),
      signal: controller.signal,
    });

    clearTimeout(fetchTimeout);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error("Failed to generate suggestions");
    }

    await mutateSuggestions();
  } catch (error) {
    console.error("[Canvas] Failed to generate suggestions:", error);
    clearTimeout(timeoutId);
  } finally {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsGenerating(false);
  }
};
```

### 迁移后 ✅

```typescript
const handleGenerateSuggestions = async () => {
  if (!projectId || !currentFramework || isGenerating) return;

  setIsGenerating(true);
  setElapsedTime(0);

  const startTime = Date.now();
  timerRef.current = setInterval(() => {
    setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
  }, 1000);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsGenerating(false);
    console.error("[Canvas] Suggestion generation timed out after 60 seconds");
  }, 60000);

  try {
    // ✅ 使用统一的 API 客户端
    await canvasApi.suggestions.generate(
      {
        projectId,
        frameworkId: currentFramework.id,
      },
      controller.signal
    );

    clearTimeout(timeoutId);
    await mutateSuggestions();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("[Canvas] API error:", error.message);
    } else {
      console.error("[Canvas] Failed to generate suggestions:", error);
    }
    clearTimeout(timeoutId);
  } finally {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsGenerating(false);
  }
};
```

**代码改进：**
- ✅ 减少 10 行代码 (从 48 行减少到 38 行)
- ✅ 移除了重复的 fetch timeout 逻辑
- ✅ 统一使用 AbortController
- ✅ 更清晰的错误处理

---

## 示例 4: Hook 中的使用 (useCanvasNodeOperations.ts)

### 迁移前 ❌

```typescript
const handleDelete = useCallback(async (node: CanvasNode) => {
  if (!confirm(`确定要删除节点"${node.title}"吗？`)) {
    return;
  }

  if (selectedNode?.id === node.id) {
    onSetSelectedNode(null);
    onSetShowAIChat(false);
    onUpdateUrl(null);
  }

  try {
    // ❌ 原始的 fetch 调用
    const response = await fetch(`/api/canvas/${node.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete node");
    }

    await mutateNodes();
  } catch (error) {
    console.error("Error deleting node:", error);
    alert("删除节点失败，请重试");
  }
}, [selectedNode, onSetSelectedNode, onSetShowAIChat, onUpdateUrl, mutateNodes]);
```

### 迁移后 ✅

```typescript
// 在文件顶部添加
import { canvasApi, ApiError } from "@/lib/api/canvas-api";

const handleDelete = useCallback(async (node: CanvasNode) => {
  if (!confirm(`确定要删除节点"${node.title}"吗？`)) {
    return;
  }

  if (selectedNode?.id === node.id) {
    onSetSelectedNode(null);
    onSetShowAIChat(false);
    onUpdateUrl(null);
  }

  try {
    // ✅ 使用统一的 API 客户端
    await canvasApi.nodes.delete(node.id);
    await mutateNodes();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error("Delete failed:", error.message, error.status);
    }
    alert("删除节点失败，请重试");
  }
}, [selectedNode, onSetSelectedNode, onSetShowAIChat, onUpdateUrl, mutateNodes]);
```

---

## 迁移清单

### 需要迁移的文件

**app/(crossmind)/canvas/page.tsx** (6 处)
- [ ] Line 453: `applySuggestion` - POST
- [ ] Line 501: `dismissSuggestion` - POST
- [ ] Line 542: `generateSuggestions` - POST
- [ ] Line 609: `handleDelete` - DELETE
- [ ] Line 669: `handleMoveToZone` - PATCH
- [ ] Line 712: `handleRestoreNode` - PATCH

**app/(crossmind)/canvas/hooks/useCanvasNodeOperations.ts** (3 处)
- [ ] Line 51: `handleDelete` - DELETE
- [ ] Line 141: `handleMoveToZone` - PATCH
- [ ] Line 197: `handleRestoreNode` - PATCH

**app/(crossmind)/canvas/hooks/useCanvasSuggestions.ts** (3 处)
- [ ] Line 77: `handleGenerateSuggestions` - POST
- [ ] Line 114: `handleApplySuggestion` - POST
- [ ] Line 174: `handleDismissSuggestion` - POST

**app/(crossmind)/canvas/hooks/useCanvasDragDrop.ts** (3 处)
- [ ] Line 101: Update `parentId` - PATCH
- [ ] Line 264: Update `zoneAffinities` - PATCH
- [ ] Line 391: Update `displayOrder` - PATCH

---

## 迁移步骤

1. **在文件顶部添加 import**
   ```typescript
   import { canvasApi, ApiError } from "@/lib/api/canvas-api";
   ```

2. **替换 fetch 调用**
   - 找到所有 `fetch(...)` 调用
   - 替换为对应的 `canvasApi.*` 方法
   - 移除手动的 headers 和 body 处理

3. **更新错误处理**
   ```typescript
   catch (error) {
     if (error instanceof ApiError) {
       console.error("API Error:", error.message, error.status);
     }
   }
   ```

4. **测试功能**
   - 确保所有操作正常工作
   - 检查错误处理是否正确
   - 验证 SWR 缓存刷新

5. **提交代码**
   ```bash
   git add .
   git commit -m "refactor: migrate to unified Canvas API client"
   ```

---

## 预期收益

迁移完成后：

- **代码减少**: 预计减少 ~150 行重复的 fetch 逻辑
- **一致性**: 所有 API 调用使用统一的错误处理
- **可维护性**: API 变更只需修改一处
- **可测试性**: 易于 mock API 进行单元测试
- **类型安全**: 完整的 TypeScript 类型支持
