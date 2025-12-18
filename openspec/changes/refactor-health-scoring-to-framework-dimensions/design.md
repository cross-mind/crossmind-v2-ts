# 设计文档：框架维度健康度评分系统

## 架构决策

### 决策 1：采用维度表而非 JSONB 存储

**选项 A（推荐）：独立表 `ProjectFrameworkHealthDimension`**

优点：
- 查询性能好（索引、JOIN 优化）
- Schema 强制约束（唯一性、外键）
- 易于扩展新字段（如评分历史、AI 评估信心度）
- 符合关系型数据库最佳实践

缺点：
- 需要额外的 JOIN 查询
- 多维度数据需要多次插入

**选项 B：JSONB 字段存储在 ProjectFramework 表**

```typescript
ProjectFramework {
  healthScore: number
  dimensionScores: jsonb  // { "problem": 85, "solution": 90, ... }
  dimensionInsights: jsonb  // { "problem": "缺少...", ... }
}
```

优点：
- 查询简单（一次查询）
- 写入原子性（一次更新）

缺点：
- 无法对单个维度建索引
- 历史记录难以追踪
- Schema 验证复杂

**最终选择**：选项 A（独立表）

**理由**：健康度功能是付费核心功能，未来可能需要追踪历史趋势、生成报表等，独立表更灵活。

---

### 决策 2：删除节点健康度字段

**问题**：是否保留 `CanvasNode` 的健康度字段作为缓存？

**选项 A（推荐）：完全删除节点健康度字段**

- 架构清晰，单一数据源（框架维度）
- 避免数据不一致问题

**选项 B：保留字段，但改为计算值（非持久化）**

- 在 `NodeContent` 类型中保留 `healthScore`
- 运行时根据节点所在 zone 的维度分数计算

**最终选择**：选项 A（完全删除）

**理由**：
1. 节点本身无健康度概念（健康度属于框架-维度）
2. 减少代码复杂度
3. 界面不再展示"节点已评分"统计

---

### 决策 3：维度权重配置方式

**选项 A（推荐）：硬编码在代码中**

```typescript
const FRAMEWORK_DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
  "lean-canvas": {
    problem: 0.15,
    solution: 0.15,
    "unique-value": 0.15,
    // ...
  },
  "business-canvas": {
    customer: 0.12,
    value: 0.12,
    // ...
  },
};
```

优点：
- 实现简单
- 修改需要代码审查（避免随意调整权重）
- 类型安全

缺点：
- 不支持运行时修改
- 新框架需要重新部署

**选项 B：存储在数据库**

创建 `FrameworkDimensionConfig` 表：
```typescript
{
  frameworkId: string
  dimensionKey: string
  weight: number
  evaluationCriteria: jsonb
}
```

优点：
- 支持动态配置
- 未来可开放给用户自定义框架

缺点：
- 查询复杂度增加
- 初始化麻烦（需要数据迁移）

**最终选择**：选项 A（硬编码）

**理由**：当前只有 5 个框架，权重调整频率低，硬编码更简单可靠。未来如果需要自定义框架功能，再考虑数据库配置。

---

##数据模型

### ERD 关系

```
Project (1) ───> (N) ProjectFramework
                       │
                       ├─ healthScore: real (总分，计算得出)
                       ├─ lastHealthCheckAt: timestamp
                       │
                       └───> (N) ProjectFrameworkHealthDimension
                              │
                              ├─ dimensionKey: text (zone.zoneKey)
                              ├─ score: real (0-100)
                              ├─ insights: text
                              └─ updatedAt: timestamp

CanvasNode
  ├─ [删除] healthScore
  ├─ [删除] healthLevel
  └─ [删除] healthData
```

### 查询模式

**获取框架健康度（含维度明细）**：

```sql
SELECT
  pf.id,
  pf.name,
  pf.healthScore,
  json_agg(json_build_object(
    'dimensionKey', pfd.dimensionKey,
    'score', pfd.score,
    'insights', pfd.insights
  )) as dimensions
FROM "ProjectFramework" pf
LEFT JOIN "ProjectFrameworkHealthDimension" pfd
  ON pf.id = pfd.projectFrameworkId
WHERE pf.id = $1
GROUP BY pf.id;
```

**更新维度分数（Upsert）**：

```sql
INSERT INTO "ProjectFrameworkHealthDimension"
  (projectFrameworkId, dimensionKey, score, insights, createdAt, updatedAt)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (projectFrameworkId, dimensionKey)
DO UPDATE SET
  score = EXCLUDED.score,
  insights = EXCLUDED.insights,
  updatedAt = NOW();
```

---

## 评分算法详解

### 维度评分公式

每个维度的分数（0-100）基于以下因素：

```typescript
dimensionScore = (
  nodeCountScore * 0.3 +      // 节点数量（至少 2 个）
  contentQualityScore * 0.3 + // 内容质量（非空，字数 > 50）
  relationshipScore * 0.2 +   // 关联关系（跨 zone 引用）
  aiSemanticScore * 0.2       // AI 语义评估（是否符合 zone 目的）
)
```

### 框架总分计算

```typescript
frameworkHealthScore = Σ(dimensionScore_i × weight_i)
```

**示例（Lean Canvas）**：

```
问题 (85分 × 15%) = 12.75
解决方案 (90分 × 15%) = 13.5
独特价值 (70分 × 15%) = 10.5
客户细分 (80分 × 10%) = 8.0
渠道 (60分 × 10%) = 6.0
收入来源 (75分 × 10%) = 7.5
成本结构 (65分 × 10%) = 6.5
关键指标 (70分 × 10%) = 7.0
壁垒优势 (50分 × 5%) = 2.5
─────────────────────────
总分 = 74.25 ≈ 74/100
```

---

## UI/UX 设计

### 健康度面板布局

```
┌─ 健康度分析 ─────────────────┐
│ 74/100 ⚠️                    │
│                              │
│ 9 条改进建议                  │
│                              │
│ 维度明细 ▼                   │
│ ┌────────────────────────┐  │
│ │ 🔴 问题        85/100  │  │
│ │ 🟢 解决方案     90/100  │  │
│ │ 🟡 独特价值     70/100  │  │
│ │ 🔵 客户细分     80/100  │  │
│ │ ... (可折叠)            │  │
│ └────────────────────────┘  │
│                              │
│ [重新分析]                   │
└──────────────────────────────┘
```

### 交互流程

1. 用户点击"重新分析"
2. 触发 AI 健康度分析（Canvas Chat）
3. AI 调用 `update-framework-health` tool
4. 工具更新维度分数 + 框架总分
5. 流式发送维度更新（逐个维度）
6. 界面实时更新分数和建议

---

## 数据迁移策略

### 迁移脚本逻辑

```typescript
async function migrateHealthScoresToDimensions() {
  // 1. 查询所有有 healthData 的节点
  const nodesWithHealth = await db
    .select()
    .from(canvasNode)
    .where(isNotNull(canvasNode.healthData));

  for (const node of nodesWithHealth) {
    // 2. 提取维度数据
    const healthData = node.healthData as any;
    const dimensions = healthData?.dimensions;

    if (!dimensions) continue;

    // 3. 确定节点所属框架和 zone
    const affinities = node.zoneAffinities as any;
    if (!affinities) continue;

    for (const [frameworkId, zoneWeights] of Object.entries(affinities)) {
      // 找到权重最高的 zone
      const topZone = Object.entries(zoneWeights as Record<string, number>)
        .sort(([, a], [, b]) => b - a)[0];

      if (!topZone) continue;

      const [zoneKey, _weight] = topZone;

      // 4. 计算该维度的分数
      const dimensionScore = calculateDimensionScore(dimensions);

      // 5. 插入到 ProjectFrameworkHealthDimension
      await db.insert(projectFrameworkHealthDimension).values({
        projectFrameworkId: node.projectFrameworkId,
        dimensionKey: zoneKey,
        score: dimensionScore,
        insights: "从旧健康度数据迁移",
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [
          projectFrameworkHealthDimension.projectFrameworkId,
          projectFrameworkHealthDimension.dimensionKey
        ],
        set: { score: dimensionScore }
      });
    }
  }

  // 6. 删除 CanvasNode 健康度字段（通过数据库迁移）
  await db.execute(sql`
    ALTER TABLE "CanvasNode"
    DROP COLUMN IF EXISTS "healthScore",
    DROP COLUMN IF EXISTS "healthLevel",
    DROP COLUMN IF EXISTS "healthData";
  `);
}
```

### 回滚方案

迁移前导出所有健康度数据：

```typescript
// 导出为 JSON 备份
const backup = await db.select().from(canvasNode)
  .where(or(
    isNotNull(canvasNode.healthScore),
    isNotNull(canvasNode.healthData)
  ));

await fs.writeFile(
  'backup-health-data.json',
  JSON.stringify(backup, null, 2)
);
```

如需回滚，从 JSON 恢复数据。

---

## 性能优化

### 查询优化

1. **复合索引**：
```sql
CREATE INDEX idx_framework_dimension
ON "ProjectFrameworkHealthDimension" (projectFrameworkId, dimensionKey);
```

2. **批量插入**：
```typescript
// 不要逐个维度插入
// ❌ for (const dimension of dimensions) { await insert(...) }

// ✅ 批量插入
await db.insert(projectFrameworkHealthDimension).values(dimensions);
```

3. **缓存总分**：
   - 维度更新后立即重新计算 `ProjectFramework.healthScore`
   - 避免每次读取都计算

### 避免 N+1 查询

```typescript
// ❌ 错误：逐个框架查询维度
const frameworks = await getProjectFrameworks(projectId);
for (const fw of frameworks) {
  const dimensions = await getDimensions(fw.id); // N+1!
}

// ✅ 正确：一次 JOIN 查询
const frameworksWithDimensions = await db
  .select()
  .from(projectFramework)
  .leftJoin(
    projectFrameworkHealthDimension,
    eq(projectFramework.id, projectFrameworkHealthDimension.projectFrameworkId)
  )
  .where(eq(projectFramework.projectId, projectId));
```

---

## 测试策略

### 单元测试

1. `updateProjectFrameworkDimensionScore()` 查询函数
2. 维度权重配置正确性
3. 总分计算公式准确性

### 集成测试

1. 创建测试框架 → 更新维度分数 → 验证总分
2. 多维度同时更新 → 验证批量插入
3. 冲突更新（Upsert）→ 验证覆盖逻辑

### E2E 测试（Chrome DevTools MCP）

1. 打开 Canvas 页面
2. 点击"重新分析"按钮
3. 等待 AI 分析完成
4. 验证健康度面板显示总分 + 维度明细
5. 点击展开维度列表
6. 验证每个维度的分数和建议
7. 切换框架 → 验证健康度独立显示

---

## 依赖与风险

### 外部依赖

- ✅ Drizzle ORM（支持 upsert）
- ✅ PostgreSQL（支持 JSONB、复合唯一约束）
- ✅ Next.js `after()` hook（流式响应后更新）

### 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|-----|-----|---------|
| 迁移脚本数据丢失 | 低 | 高 | 迁移前完整备份，提供回滚脚本 |
| AI 评分不准确 | 中 | 中 | 先用简单规则，逐步优化 prompt |
| 查询性能下降 | 低 | 中 | 添加索引，使用 JOIN 优化 |
| Upsert 冲突处理错误 | 低 | 低 | 单元测试覆盖所有边缘情况 |

---

## 未来扩展

### Phase 1（本次实现）：基础维度评分

- 创建表和查询函数
- 实现 AI tool 集成
- 界面显示总分 + 维度明细

### Phase 2（未来优化）：历史趋势追踪

- 新增字段：`evaluatedAt: timestamp`
- 保留历史评分记录（不覆盖，插入新记录）
- 界面显示健康度趋势图

### Phase 3（未来功能）：自定义框架和权重

- 允许用户创建自定义框架
- 支持调整维度权重
- 配置评分规则

### Phase 4（高级功能）：智能建议优先级

- 根据维度分数自动排序建议
- 低分维度的建议优先显示
- 支持"快速修复"模式（一键应用高优先级建议）
