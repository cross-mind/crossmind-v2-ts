# 实施任务：框架维度健康度评分系统

## Phase 1: Schema 和数据基础（优先级：高）

### T1.1 创建 ProjectFrameworkHealthDimension 表

**验收标准**：
- [ ] Schema 定义完成（lib/db/schema.ts）
- [ ] 生成数据库迁移文件
- [ ] 迁移执行成功（dev 和 test 环境）
- [ ] 复合唯一索引创建成功

**实施细节**：
```typescript
export const projectFrameworkHealthDimension = pgTable(
  "ProjectFrameworkHealthDimension",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    projectFrameworkId: uuid("projectFrameworkId")
      .notNull()
      .references(() => projectFramework.id, { onDelete: "cascade" }),
    dimensionKey: text("dimensionKey").notNull(),
    score: real("score").notNull(),
    insights: text("insights"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => ({
    unique: unique().on(table.projectFrameworkId, table.dimensionKey),
  })
);
```

**依赖**：无
**并行**：可与 T1.2 并行

---

### T1.2 实现维度分数查询函数

**验收标准**：
- [ ] `updateProjectFrameworkDimensionScore()` 实现 upsert 逻辑
- [ ] `getProjectFrameworkDimensions()` 查询单个框架的所有维度
- [ ] `getProjectFrameworksWithDimensions()` JOIN 查询优化
- [ ] 单元测试覆盖所有函数

**实施细节**：

```typescript
// lib/db/queries.ts

export async function updateProjectFrameworkDimensionScore({
  projectFrameworkId,
  dimensionKey,
  score,
  insights,
}: {
  projectFrameworkId: string;
  dimensionKey: string;
  score: number;
  insights: string;
}) {
  await db
    .insert(projectFrameworkHealthDimension)
    .values({
      projectFrameworkId,
      dimensionKey,
      score,
      insights,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        projectFrameworkHealthDimension.projectFrameworkId,
        projectFrameworkHealthDimension.dimensionKey,
      ],
      set: {
        score,
        insights,
        updatedAt: new Date(),
      },
    });
}

export async function getProjectFrameworkDimensions(
  projectFrameworkId: string
) {
  return await db
    .select()
    .from(projectFrameworkHealthDimension)
    .where(eq(projectFrameworkHealthDimension.projectFrameworkId, projectFrameworkId));
}
```

**依赖**：T1.1
**并行**：可与 T1.3 并行

---

### T1.3 编写数据迁移脚本

**验收标准**：
- [ ] 迁移脚本创建（scripts/migrate-health-to-dimensions.ts）
- [ ] 备份逻辑完成（导出为 JSON）
- [ ] 迁移逻辑测试通过（本地 dev 数据库）
- [ ] 回滚脚本创建（可选）

**实施细节**：
- 读取所有 `CanvasNode.healthData`
- 根据 `zoneAffinities` 确定维度
- 插入到 `ProjectFrameworkHealthDimension`
- 生成备份文件 `backup-health-data-{timestamp}.json`

**依赖**：T1.1, T1.2
**并行**：否

---

### T1.4 删除 CanvasNode 健康度字段

**验收标准**：
- [ ] 生成数据库迁移文件（删除 3 个字段）
- [ ] 迁移执行成功
- [ ] Schema 类型更新（lib/db/schema.ts）
- [ ] TypeScript 类型更新（canvas-data.ts 的 NodeContent）

**实施细节**：

```sql
-- 迁移文件
ALTER TABLE "CanvasNode"
DROP COLUMN IF EXISTS "healthScore",
DROP COLUMN IF EXISTS "healthLevel",
DROP COLUMN IF EXISTS "healthData";
```

```typescript
// canvas-data.ts - 删除以下字段
export interface NodeContent {
  // [删除] healthScore?: number | string | null;
  // [删除] healthLevel?: "critical" | "warning" | "good" | "excellent" | null;
  // [删除] healthData?: { ... };
}
```

**依赖**：T1.3（必须先迁移数据）
**并行**：否

---

## Phase 2: 后端逻辑实现（优先级：高）

### T2.1 更新 update-framework-health AI tool

**验收标准**：
- [ ] Tool 正确调用 `updateProjectFrameworkDimensionScore()`
- [ ] 支持流式发送维度更新
- [ ] 更新框架总分（基于维度加权平均）
- [ ] 错误处理完善

**实施细节**：

```typescript
// lib/ai/tools/update-framework-health.ts

for (const [dimensionKey, score] of Object.entries(dimensionScores)) {
  await updateProjectFrameworkDimensionScore({
    projectFrameworkId: context.projectFrameworkId,
    dimensionKey,
    score,
    insights: `${dimensionKey}: ${score}/100`,
  });

  dataStream.write({
    type: "data-dimension-score",
    data: { dimensionKey, score },
    transient: true,
  });
}

// 计算框架总分
const weights = FRAMEWORK_DIMENSION_WEIGHTS[context.frameworkId] || {};
const totalScore = Object.entries(dimensionScores)
  .reduce((sum, [key, score]) => sum + score * (weights[key] || 0.1), 0);

await updateProjectFrameworkHealth({
  id: context.projectFrameworkId,
  healthScore: totalScore,
  lastHealthCheckAt: new Date(),
});
```

**依赖**：T1.2
**并行**：可与 T2.2 并行

---

### T2.2 添加维度权重配置

**验收标准**：
- [ ] 创建 `lib/canvas/framework-weights.ts`
- [ ] 定义所有框架的维度权重
- [ ] 权重总和 = 1.0（验证函数）
- [ ] 导出类型安全的权重映射

**实施细节**：

```typescript
// lib/canvas/framework-weights.ts

export const FRAMEWORK_DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
  "lean-canvas": {
    problem: 0.15,
    solution: 0.15,
    "unique-value": 0.15,
    "customer-segments": 0.10,
    channels: 0.10,
    revenue: 0.10,
    cost: 0.10,
    "key-metrics": 0.10,
    "unfair-advantage": 0.05,
  },
  // ... 其他框架
};

// 验证权重总和
export function validateFrameworkWeights() {
  for (const [frameworkId, weights] of Object.entries(FRAMEWORK_DIMENSION_WEIGHTS)) {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error(`${frameworkId} weights sum to ${sum}, not 1.0`);
    }
  }
}
```

**依赖**：无
**并行**：可与 T2.1 并行

---

### T2.3 更新 Canvas API 返回维度数据

**验收标准**：
- [ ] `GET /api/canvas/frameworks/:id` 返回维度数据
- [ ] 响应格式包含 `dimensions` 数组
- [ ] 前端类型定义更新

**实施细节**：

```typescript
// app/api/canvas/frameworks/[id]/route.ts

const framework = await getProjectFramework(id);
const dimensions = await getProjectFrameworkDimensions(id);

return NextResponse.json({
  ...framework,
  dimensions: dimensions.map(d => ({
    dimensionKey: d.dimensionKey,
    score: d.score,
    insights: d.insights,
    updatedAt: d.updatedAt,
  })),
});
```

**依赖**：T1.2
**并行**：可与 T2.1 并行

---

## Phase 3: 前端界面更新（优先级：中）

### T3.1 更新 HealthOverview 组件显示维度明细

**验收标准**：
- [ ] 显示框架总分（保持不变）
- [ ] 添加维度列表（可折叠）
- [ ] 每个维度显示：名称、分数、颜色编码
- [ ] 点击维度显示该维度的改进建议

**实施细节**：

```tsx
// app/(crossmind)/canvas/components/HealthOverview.tsx

interface Dimension {
  dimensionKey: string;
  score: number;
  insights: string;
}

export function HealthOverview({
  currentFramework,
  dimensions,  // 新增 prop
  suggestions,
  // ...
}: HealthOverviewProps) {
  const [expandedDimensions, setExpanded] = useState(false);

  return (
    <PopoverContent className="w-[500px]">
      <div className="space-y-4">
        {/* 总分显示 */}
        <div>
          <h4 className="font-semibold">{avgScore}/100</h4>
        </div>

        {/* 维度明细 */}
        <div>
          <button
            onClick={() => setExpanded(!expandedDimensions)}
            className="flex items-center gap-2 text-sm"
          >
            维度明细 {expandedDimensions ? "▼" : "▶"}
          </button>

          {expandedDimensions && (
            <div className="mt-2 space-y-1">
              {dimensions.map(dim => {
                const zone = currentFramework?.zones.find(z => z.zoneKey === dim.dimensionKey);
                const color = getDimensionColor(dim.score);

                return (
                  <div key={dim.dimensionKey} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${color}`} />
                    <span className="text-sm flex-1">{zone?.name}</span>
                    <span className="text-sm font-medium">{dim.score}/100</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 改进建议 */}
        {/* ... 现有代码 ... */}
      </div>
    </PopoverContent>
  );
}
```

**依赖**：T2.3
**并行**：否

---

### T3.2 移除节点健康度相关 UI

**验收标准**：
- [ ] 删除 HealthOverview 中的"节点已评分"统计
- [ ] 删除 CanvasNodeCard 中的健康度指示器（如果有）
- [ ] 删除所有引用 `node.healthScore` 的代码

**实施细节**：

```tsx
// HealthOverview.tsx - 删除以下代码
{nodesWithHealth.length > 0 && (
  <p className="text-xs text-muted-foreground">
    {nodesWithHealth.length} 个节点已评分
  </p>
)}

// CanvasNodeCard.tsx - 删除健康度徽章（如果存在）
```

**依赖**：T1.4
**并行**：可与 T3.1 并行

---

### T3.3 添加维度权重配置界面（可选）

**验收标准**：
- [ ] 创建 `DimensionWeightsPanel` 组件
- [ ] 显示当前框架的维度权重
- [ ] 支持调整权重（拖动滑块）
- [ ] 实时验证权重总和 = 1.0

**实施细节**：
- 初期硬编码权重，此任务可延后到 Phase 4

**依赖**：T2.2
**并行**：是（低优先级）

---

## Phase 4: 测试和优化（优先级：中）

### T4.1 编写单元测试

**验收标准**：
- [ ] 查询函数测试（upsert、get、join）
- [ ] 权重验证函数测试
- [ ] 总分计算函数测试
- [ ] 测试覆盖率 > 80%

**依赖**：T1.2, T2.2
**并行**：可与实施并行

---

### T4.2 编写集成测试

**验收标准**：
- [ ] 创建框架 → 更新维度 → 验证数据库
- [ ] AI tool 调用 → 验证维度数据正确保存
- [ ] 多维度批量更新测试

**依赖**：T2.1
**并行**：可与 T4.1 并行

---

### T4.3 E2E 测试（Chrome DevTools MCP）

**验收标准**：
- [ ] 打开 Canvas 页面
- [ ] 点击"重新分析"
- [ ] 验证维度分数逐个更新（流式）
- [ ] 验证健康度面板显示总分 + 维度明细
- [ ] 截图保存到 `.logs/health-dimensions-e2e.png`
- [ ] 清理测试代码和日志

**依赖**：T3.1
**并行**：否

---

### T4.4 性能优化

**验收标准**：
- [ ] 添加索引：`(projectFrameworkId, dimensionKey)`
- [ ] 优化查询：使用 JOIN 代替 N+1
- [ ] 批量插入维度数据
- [ ] 响应时间 < 200ms（框架健康度查询）

**依赖**：T1.1
**并行**：可与其他任务并行

---

## Phase 5: 文档和部署（优先级：低）

### T5.1 更新 API 文档

**验收标准**：
- [ ] 更新 OpenAPI schema（如果有）
- [ ] 更新 CLAUDE.md 文档
- [ ] 添加健康度评分架构说明

**依赖**：T2.3
**并行**：是

---

### T5.2 更新数据库迁移指南

**验收标准**：
- [ ] 在 README 或 DEPLOYMENT.md 添加迁移步骤
- [ ] 提供回滚命令
- [ ] 警告信息（备份数据）

**依赖**：T1.3
**并行**：是

---

### T5.3 生产环境部署

**验收标准**：
- [ ] 执行数据迁移脚本（prod 数据库）
- [ ] 验证无数据丢失
- [ ] 监控查询性能
- [ ] 回滚计划准备

**依赖**：所有前置任务
**并行**：否

---

## 任务依赖图

```
T1.1 (创建表)
  ↓
T1.2 (查询函数) ──┬→ T2.1 (更新 AI tool)
  ↓               ├→ T2.3 (API 返回维度)
T1.3 (迁移脚本)  │    ↓
  ↓               │  T3.1 (UI 显示维度)
T1.4 (删除字段) ─┴→ T3.2 (移除节点 UI)
                      ↓
                    T4.3 (E2E 测试)
                      ↓
                    T5.3 (部署)

T2.2 (权重配置) → T2.1 (AI tool)
                → T4.1 (单元测试)

T4.1, T4.2, T4.4 (测试和优化) - 可并行
T5.1, T5.2 (文档) - 可并行
```

---

## 预估工作量

| Phase | 任务数 | 预估时间 |
|-------|-------|---------|
| Phase 1: Schema 和数据 | 4 | 高优先级 |
| Phase 2: 后端逻辑 | 3 | 高优先级 |
| Phase 3: 前端界面 | 3 | 中优先级 |
| Phase 4: 测试优化 | 4 | 中优先级 |
| Phase 5: 文档部署 | 3 | 低优先级 |

**总计**: 17 个任务

---

## 关键里程碑

1. ✅ **Milestone 1**: Schema 创建完成（T1.1）
2. ✅ **Milestone 2**: 数据迁移完成（T1.3, T1.4）
3. ✅ **Milestone 3**: AI tool 正确保存维度数据（T2.1）
4. ✅ **Milestone 4**: 界面显示维度明细（T3.1）
5. ✅ **Milestone 5**: E2E 测试通过（T4.3）
6. ✅ **Milestone 6**: 生产环境部署（T5.3）
