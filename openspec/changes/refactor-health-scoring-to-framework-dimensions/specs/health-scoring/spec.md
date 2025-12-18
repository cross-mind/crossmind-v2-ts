# Capability: 健康度评分系统

## MODIFIED Requirements

### Requirement: 框架维度健康度评分

健康度评分系统 MUST 基于框架维度（zones）而非节点，每个框架的每个维度 MUST 独立评分，框架总分 MUST 为维度加权平均。

#### Scenario: AI 分析框架健康度并保存维度分数

**Given** 用户在 Canvas 页面点击"重新分析"按钮
**When** AI 分析框架健康度
**Then** AI tool 调用 `updateProjectFrameworkDimensionScore()` 为每个维度保存分数
**And** 维度分数存储在 `ProjectFrameworkHealthDimension` 表
**And** 框架总分更新到 `ProjectFramework.healthScore`

#### Scenario: 切换框架显示不同健康度

**Given** 项目有多个框架（如 Lean Canvas 和 Business Canvas）
**When** 用户切换到 Lean Canvas 框架
**Then** 健康度面板显示 Lean Canvas 的总分和 9 个维度分数
**When** 用户切换到 Business Canvas 框架
**Then** 健康度面板显示 Business Canvas 的总分和 9 个维度分数
**And** 两个框架的健康度分数完全独立

#### Scenario: 维度分数计算基于 zone 内容

**Given** Lean Canvas 框架的"问题" zone 包含 3 个节点
**When** AI 评估该维度
**Then** 维度分数基于：节点数量（30%）+ 内容质量（30%）+ 关联关系（20%）+ AI 语义评估（20%）
**And** 分数范围为 0-100

---

### Requirement: 维度权重配置

每个框架的维度权重 MUST 硬编码在代码中，权重总和 MUST 为 1.0，用于计算框架总分。

#### Scenario: 使用预定义权重计算框架总分

**Given** Lean Canvas 框架有 9 个维度及其权重配置
**When** 系统计算框架总分
**Then** 总分 = Σ(维度分数 × 权重)
**And** 权重总和验证为 1.0

**Example**:
```
问题 (85 × 0.15) + 解决方案 (90 × 0.15) + ... = 74/100
```

---

## REMOVED Requirements

### Requirement: 节点级别健康度评分

节点本身不再有健康度概念，健康度仅存在于框架-维度级别。

#### Scenario: 节点不再显示健康度分数

**Given** Canvas 页面显示节点卡片
**When** 用户查看节点
**Then** 节点卡片不显示健康度指示器
**And** `CanvasNode` 表不包含 `healthScore`、`healthLevel`、`healthData` 字段

---

## ADDED Requirements

### Requirement: 维度健康度历史追踪（未来功能）

系统 SHALL 支持记录维度健康度的历史变化，用于趋势分析。

#### Scenario: 查看维度健康度趋势图（未来实现）

**Given** 框架维度已多次评分
**When** 用户查看健康度历史
**Then** 界面显示各维度分数的时间线图表
**And** 支持对比不同时间点的健康度变化

**Note**: 此需求在当前 Change 中不实现，仅作为未来扩展记录。
