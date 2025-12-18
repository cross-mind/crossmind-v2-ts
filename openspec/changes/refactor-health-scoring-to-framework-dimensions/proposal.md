# Proposal: 重构健康度评分为框架维度模型

**Change ID**: `refactor-health-scoring-to-framework-dimensions`
**状态**: Draft
**创建时间**: 2025-12-18

## 问题陈述

当前健康度系统存在架构缺陷：

1. **节点健康度与框架无关**
   - `CanvasNode` 表的 `healthScore`/`healthLevel`/`healthData` 是全局字段
   - 同一节点在所有框架中共享同一分数
   - 与框架特定的 `positions`、`zoneAffinities`、`hiddenInFrameworks` 设计不一致

2. **评分逻辑混乱**
   - 界面显示框架级总分（`ProjectFramework.healthScore`）
   - 但旧逻辑会计算节点平均分作为回退
   - 两种分数来源缺乏明确关系

3. **无法反映框架维度**
   - Lean Canvas 有 9 个 zones（问题、解决方案、独特价值等）
   - 健康度应该评估每个 zone 的完整性，而不是节点本身
   - 当前无法展示"哪些维度需要改进"

4. **功能实现不完整**
   - `updateProjectFrameworkDimensionScore()` 查询函数已存在但是空实现
   - `update-framework-health` AI tool 已调用维度更新，但数据无处存储
   - `ProjectFrameworkHealthDimension` 表不存在

## 提议方案

采用 **框架维度评分法**，将健康度从节点级别提升到框架-维度级别：

### 核心理念

**健康度 = 框架各维度（zones）的完整性和质量**

- 评估对象：框架的每个 zone（如 Lean Canvas 的"问题"、"解决方案"）
- 评分维度：节点数量、内容质量、关联关系、AI 语义评估
- 总分计算：所有维度分数的加权平均

### 架构变更

#### 1. 新增表：ProjectFrameworkHealthDimension

```typescript
export const projectFrameworkHealthDimension = pgTable("ProjectFrameworkHealthDimension", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectFrameworkId: uuid("projectFrameworkId")
    .notNull()
    .references(() => projectFramework.id, { onDelete: "cascade" }),
  dimensionKey: text("dimensionKey").notNull(),  // 对应 zone.zoneKey
  score: real("score").notNull(),                // 0-100 分数
  insights: text("insights"),                    // AI 评估该维度的建议
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
}, (table) => ({
  // 复合唯一约束：同一框架的同一维度只有一条记录
  unique: unique().on(table.projectFrameworkId, table.dimensionKey),
}));
```

#### 2. 移除 CanvasNode 健康度字段

删除以下字段（数据迁移方案见下文）：
- `healthScore: varchar("healthScore")`
- `healthLevel: varchar("healthLevel")`
- `healthData: jsonb("healthData")`

#### 3. 数据流向

```
AI 健康度分析
  ↓
update-framework-health tool
  ↓
保存到 ProjectFrameworkHealthDimension (按 zone 分别评分)
  ↓
计算 ProjectFramework.healthScore (加权平均)
  ↓
界面展示总分 + 各维度明细
```

### 评分算法示例（Lean Canvas）

| 维度 (zoneKey) | 评分标准 | 权重 |
|---------------|---------|-----|
| problem | 是否定义核心问题？节点数量 ≥ 3？ | 15% |
| solution | 是否有解决方案？与问题关联？ | 15% |
| unique-value | 是否定义独特价值主张？ | 15% |
| customer-segments | 是否明确客户细分？ | 10% |
| channels | 是否规划渠道？ | 10% |
| revenue | 是否有收入模式？ | 10% |
| cost | 是否分析成本结构？ | 10% |
| key-metrics | 是否定义关键指标？ | 10% |
| unfair-advantage | 是否思考壁垒优势？ | 5% |

**总分** = Σ(维度分数 × 权重)

## 实施计划

### Phase 1: Schema 和数据迁移（优先级：高）

1. 创建 `ProjectFrameworkHealthDimension` 表
2. 数据迁移脚本：
   - 从 `CanvasNode.healthData` 提取现有维度数据（如果有）
   - 迁移到新表
   - 删除 CanvasNode 的三个健康度字段

### Phase 2: 后端逻辑更新（优先级：高）

1. 实现 `updateProjectFrameworkDimensionScore()` 查询函数
2. 添加 `getProjectFrameworkDimensions()` 查询函数
3. 更新 `update-framework-health` AI tool 以正确保存维度数据
4. 更新框架总分计算逻辑（基于维度加权平均）

### Phase 3: 界面展示（优先级：中）

1. 修改 `HealthOverview` 组件：
   - 显示各维度分数（可折叠列表）
   - 支持点击查看该维度的改进建议
   - 移除节点健康度统计（如"82 个节点已评分"）

2. 可选：添加 Zone 级别健康度指示器
   - 在 Canvas 画布的每个 zone 显示小徽章
   - 颜色编码（红/黄/蓝/绿）

### Phase 4: AI Prompt 优化（优先级：低）

1. 更新健康度分析 prompt
2. 明确告知 AI 按 zone 评分
3. 提供每个 zone 的具体评分标准

## 向后兼容策略

**选择：破坏性变更（需要数据迁移）**

**理由**：
- 现有 CanvasNode 健康度数据很少（测试环境）
- 新架构更清晰，值得一次性迁移
- 提供数据迁移脚本确保数据不丢失

**迁移脚本逻辑**：
```typescript
// 1. 读取所有有 healthData 的 CanvasNode
// 2. 提取 dimensions 信息
// 3. 根据节点的 zoneAffinities 确定所属 zone
// 4. 插入到 ProjectFrameworkHealthDimension
// 5. 删除 CanvasNode 的健康度字段
```

## 依赖关系

- ✅ `update-framework-health` AI tool 已存在
- ✅ `updateProjectFrameworkHealth()` 查询函数已存在
- ⚠️ `updateProjectFrameworkDimensionScore()` 是空实现（需完善）
- ❌ `ProjectFrameworkHealthDimension` 表不存在（需创建）

## 预期收益

1. **架构清晰**：健康度与框架维度直接对应
2. **可扩展性**：支持不同框架的不同维度数量和权重
3. **用户价值**：用户能看到具体哪些维度需要改进
4. **数据一致性**：避免节点健康度与框架健康度的混淆

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|-----|---------|
| 数据迁移失败 | 现有健康度数据丢失 | 提供回滚脚本，迁移前备份数据库 |
| AI 评分逻辑需重新设计 | 初期分数可能不准确 | 先用简单规则（节点数量），逐步优化 AI prompt |
| 界面改动较大 | 影响用户体验 | 保持总分显示不变，维度明细作为可选展开项 |
| 性能问题（多次查询维度） | 健康度加载变慢 | 使用 JOIN 一次性查询所有维度数据 |

## 成功标准

- [ ] `ProjectFrameworkHealthDimension` 表创建成功
- [ ] 数据迁移脚本执行无错误
- [ ] `update-framework-health` tool 正确保存维度数据
- [ ] 界面显示框架总分 + 各维度分数
- [ ] 切换框架时各框架独立显示健康度
- [ ] E2E 测试：生成健康度分析 → 查看维度明细 → 应用改进建议
