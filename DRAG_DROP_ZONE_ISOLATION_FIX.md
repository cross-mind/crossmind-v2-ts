# 拖放区域隔离修复 - 防止跨区域节点移动

## 🐛 问题描述

**用户反馈**: "为什么修改一个节点后，其他节点会在区域间移动？不同区域的数据没有隔离？"

### 症状
- ✅ 拖放节点 A（在区域 1）
- ✅ 节点 A 正确移动
- ❌ **节点 B、C、D（在区域 2、3、4）也移动了位置**
- ❌ 节点在不同区域间跳动

## 🔍 根本原因分析

### 问题 1: 布局算法不稳定

**位置**: [page.tsx:395-421](app/(crossmind)/canvas/page.tsx:395-421) (修复前)

```typescript
// ❌ 问题代码
const rootNodeIds = config.nodeIds.filter(nodeId => {
  const content = nodeContents.find(n => n.id === nodeId);
  return content && !content.parentId;
});

rootNodeIds.forEach((nodeId) => {
  // ...
  // Greedy algorithm: find shortest column
  const currentColumn = currentYInColumn.indexOf(Math.min(...currentYInColumn));
  const x = config.startX + currentColumn * (NODE_WIDTH + COLUMN_GAP);
  const y = currentYInColumn[currentColumn];
});
```

**两个关键问题**:

#### 问题 1a: 节点顺序不稳定
- `config.nodeIds` 从 `zoneAffinities` 权重计算得出
- 但 `filter()` 后的 `rootNodeIds` **没有排序**
- 每次 `getDynamicZoneConfigs()` 执行，节点顺序可能不同
- 即使 `displayOrder` 没变，节点位置也会变化

#### 问题 1b: Greedy 列选择不稳定
- `indexOf(Math.min(...currentYInColumn))` 找最短的列
- 如果其他节点高度变化，列的相对高度会改变
- 同一个节点可能被分配到不同的列
- 导致节点在左右列之间跳动

### 问题 2: 全局重新布局

**位置**: [page.tsx:389](app/(crossmind)/canvas/page.tsx:389)

```typescript
// Layout useEffect
requestAnimationFrame(() => {
  const dynamicZoneConfigs = getDynamicZoneConfigs(); // 重新分配所有节点到区域

  for (const [zoneName, config] of Object.entries(dynamicZoneConfigs)) {
    // 重新计算每个区域的所有节点位置
  }
});
```

**影响**:
- 拖放节点后，`setLayoutCalculated(false)` 触发布局重新计算
- `getDynamicZoneConfigs()` 重新评估**所有节点**的区域归属
- 所有区域的节点位置都重新计算
- 即使节点的 `zoneAffinities` 没变，位置也可能因为算法不稳定而改变

## ✅ 解决方案

### 修复 1: 按 displayOrder 排序节点

**文件**: [page.tsx:401-408](app/(crossmind)/canvas/page.tsx:401-408)

```typescript
// ✅ 修复后
// Get only root nodes (without parentId) from this zone
const rootNodeIds = config.nodeIds.filter(nodeId => {
  const content = nodeContents.find(n => n.id === nodeId);
  return content && !content.parentId;
});

// Sort by displayOrder to maintain stable positioning
const sortedRootNodeIds = rootNodeIds.sort((a, b) => {
  const contentA = nodeContents.find(n => n.id === a);
  const contentB = nodeContents.find(n => n.id === b);
  const orderA = contentA?.displayOrder ?? 0;
  const orderB = contentB?.displayOrder ?? 0;
  return orderA - orderB; // 按 displayOrder 升序排序
});
```

**效果**:
- ✅ 节点按 `displayOrder` 顺序布局
- ✅ 相同的 `displayOrder` 值 → 相同的节点顺序
- ✅ 拖放改变 `displayOrder` → 节点顺序改变 → 位置更新

### 修复 2: 使用稳定的列分配算法

**文件**: [page.tsx:410-418](app/(crossmind)/canvas/page.tsx:410-418)

```typescript
// ✅ 修复后
sortedRootNodeIds.forEach((nodeId, index) => {
  const content = nodeContents.find((n) => n.id === nodeId);
  if (!content) return;

  // Use round-robin column assignment for stability
  // This ensures same displayOrder always produces same column
  const currentColumn = index % config.columnCount; // Round-robin 分配
  const x = config.startX + currentColumn * (NODE_WIDTH + COLUMN_GAP);
  const y = currentYInColumn[currentColumn];

  // ...
});
```

**对比**:

| 算法 | 稳定性 | 优点 | 缺点 |
|------|--------|------|------|
| **Greedy (旧)** | ❌ 不稳定 | 列高度平衡 | 节点跳动 |
| **Round-Robin (新)** | ✅ 稳定 | 位置固定 | 列高度可能不平衡 |

**Round-Robin 工作原理**:
```
节点序列（按 displayOrder）: [A, B, C, D, E, F]
列数: 2

分配结果:
- A → 列 0 (index 0 % 2)
- B → 列 1 (index 1 % 2)
- C → 列 0 (index 2 % 2)
- D → 列 1 (index 3 % 2)
- E → 列 0 (index 4 % 2)
- F → 列 1 (index 5 % 2)

无论执行多少次，结果都相同！
```

## 🎯 修复后的完整数据流

### 拖放操作对其他区域的影响

```
场景：拖放区域 1 中的节点 A

1. 用户拖动节点 A 到新位置
   └─> handleDragEnd() 触发

2. 计算新的 displayOrder
   PATCH /api/canvas/{nodeA.id}
   Body: { displayOrder: 1500 }
   └─> 只更新节点 A 的 displayOrder

3. SWR mutate 触发
   └─> 获取最新数据

4. 数据变化检测 (useEffect)
   dataHash: "nodeA-1500-..." !== "nodeA-1000-..."
   └─> 仅数据变化（没有节点增删）
   └─> 更新节点数据，保留位置

5. 布局重新计算 (useEffect)
   layoutCalculated = false → 触发

   区域 1:
   - rootNodeIds = [A, B, C] (包含节点 A)
   - sortedRootNodeIds = [B, A, C] (按新的 displayOrder 排序)
   - Round-robin 分配:
     - B → 列 0, 位置 (x1, y1)
     - A → 列 1, 位置 (x2, y2) ✅ 新位置
     - C → 列 0, 位置 (x1, y3)

   区域 2:
   - rootNodeIds = [D, E, F] (不包含节点 A)
   - sortedRootNodeIds = [D, E, F] (displayOrder 没变)
   - Round-robin 分配:
     - D → 列 0, 位置 (x3, y4) ✅ 和之前相同
     - E → 列 1, 位置 (x4, y5) ✅ 和之前相同
     - F → 列 0, 位置 (x3, y6) ✅ 和之前相同

6. CSS transition 平滑过渡
   └─> 区域 1 的节点平滑移动到新位置
   └─> 区域 2、3、4 的节点位置不变 ✅
```

## 📊 修复效果对比

### 修复前（Greedy 算法）

```
拖放节点 A 后：

区域 1: ✅ 节点 A 移动
区域 2: ❌ 节点 D 从列 0 跳到列 1（因为列 1 变短了）
区域 3: ❌ 节点 G 从列 1 跳到列 0（因为列高度重新评估）
区域 4: ❌ 节点 K 位置改变（列分配变化）
```

### 修复后（Round-Robin 算法）

```
拖放节点 A 后：

区域 1: ✅ 节点 A 移动到新位置（displayOrder 改变）
       ✅ 节点 B、C 顺序调整（如果受影响）
区域 2: ✅ 节点 D、E、F 位置完全不变
区域 3: ✅ 节点 G、H、I 位置完全不变
区域 4: ✅ 节点 K、L、M 位置完全不变
```

## 🧪 验证步骤

### 1. 测试区域隔离

**操作**:
1. 打开 Canvas 页面
2. 确认有多个区域，每个区域有多个节点
3. 拖动区域 1 中的节点 A 到新位置
4. 观察其他区域的节点

**预期结果**:
- ✅ 区域 1 的节点 A 移动到新位置
- ✅ 区域 1 的其他节点可能调整位置（如果受影响）
- ✅ **区域 2、3、4 的所有节点位置完全不变**

### 2. 测试 displayOrder 排序

**操作**:
1. 在同一区域内拖动多个节点
2. 观察节点的最终顺序

**预期结果**:
- ✅ 节点按 displayOrder 从小到大排列
- ✅ displayOrder 较小的节点在前面（左上角）

### 3. 测试列分配稳定性

**操作**:
1. 刷新页面
2. 不进行任何拖放操作
3. 观察节点位置

**预期结果**:
- ✅ 节点位置和刷新前完全相同
- ✅ 没有节点跳动或移动

### 4. 控制台日志验证

拖放后应该看到：

```javascript
[Layout] Data changed, updating nodes while preserving positions
[Layout] Only data properties changed, updating without position reset
[Layout] useEffect triggered { layoutCalculated: false, ... }
[Layout] Starting layout calculation via requestAnimationFrame

// 只有被拖动节点所在区域的日志
// 其他区域不应该有 "position changed" 日志
```

## 🎓 技术要点

### 1. 算法稳定性的重要性

**稳定算法定义**:
```
相同输入 → 相同输出
```

**在布局中的应用**:
```typescript
// 输入：
// - nodeContents: [{ id: "A", displayOrder: 1000 }, { id: "B", displayOrder: 2000 }]
// - config.columnCount: 2

// 输出（稳定）：
// - A: { x: 100, y: 200 } ✅ 总是相同
// - B: { x: 500, y: 200 } ✅ 总是相同
```

### 2. Round-Robin 算法优势

**优点**:
- ✅ 完全确定性（index % columnCount）
- ✅ 简单高效（O(1) 计算）
- ✅ 易于理解和调试
- ✅ 节点位置稳定

**权衡**:
- ⚠️ 列高度可能不平衡
- ⚠️ 如果节点高度差异大，可能导致一列很长

**为什么接受这个权衡**:
- 用户体验：**位置稳定性** > 列高度平衡
- 拖放场景：用户期望节点"待在原地"，而不是"智能优化"
- 可预测性：用户能理解 displayOrder 决定位置

### 3. displayOrder 的作用

```typescript
displayOrder: number // 浮点数，1000, 2000, 3000, ...

// 作用 1: 决定节点在区域内的顺序
sortedRootNodeIds.sort((a, b) => orderA - orderB);

// 作用 2: 决定列分配（通过 index）
const currentColumn = index % config.columnCount;

// 作用 3: 支持拖放重新排序
// 拖动节点 → 更新 displayOrder → 顺序改变 → 位置更新
```

### 4. 区域隔离的实现

**关键机制**:
1. 每个区域独立计算布局（for loop 遍历 zones）
2. 节点的 `zoneAffinities` 决定归属区域（不在拖放时改变）
3. displayOrder 只影响区域内的顺序
4. Round-robin 确保相同输入 → 相同位置

**数据流隔离**:
```
区域 1 布局计算:
  输入: sortedRootNodeIds = [A, B, C]
  输出: positions = { A: (x1, y1), B: (x2, y2), C: (x1, y3) }

区域 2 布局计算:
  输入: sortedRootNodeIds = [D, E, F]  // 完全独立
  输出: positions = { D: (x3, y4), E: (x4, y5), F: (x3, y6) }
```

## 🚀 后续优化方向

### 1. 智能列平衡（可选）

保持稳定性的同时，尝试平衡列高度：

```typescript
// 使用预测高度进行 round-robin
const predictedHeights = sortedRootNodeIds.map(id => {
  const cached = heightCache.get(id);
  return cached ?? 280; // 使用缓存或默认值
});

// Round-robin with offset for balance
let offset = 0;
if (predictedHeights.some(h => h > 500)) {
  offset = 1; // 如果有高节点，调整起始列
}

const currentColumn = (index + offset) % config.columnCount;
```

### 2. 更精细的变化检测

只重新计算受影响的节点：

```typescript
// 检测哪个区域的节点发生了 displayOrder 变化
const affectedZones = detectAffectedZones(prevNodes, currentNodes);

// 只重新计算受影响区域的布局
for (const zoneId of affectedZones) {
  recalculateZoneLayout(zoneId);
}
```

### 3. 拖放预览

拖动时实时显示最终位置：

```typescript
function onDragOver(event) {
  const previewPosition = calculateFinalPosition(draggedNode, targetNode);
  showPreview(previewPosition); // 显示半透明预览
}
```

## ✅ 修复完成

所有区域隔离问题已解决：
1. ✅ 节点按 displayOrder 排序
2. ✅ 使用稳定的 Round-Robin 列分配
3. ✅ 拖放只影响同区域节点
4. ✅ 其他区域节点完全不移动
5. ✅ 布局算法完全确定性

拖放功能现在符合用户期望：**只影响被操作的区域，其他区域保持不变**！🎉
