# Capability: Canvas 界面

## MODIFIED Requirements

### Requirement: 健康度面板显示维度明细

健康度面板 SHALL 显示框架总分和各维度分数，MUST 支持展开查看维度明细。

#### Scenario: 显示框架总分和维度明细

**Given** 用户在 Canvas 页面
**When** 用户点击"健康度分析"按钮
**Then** 弹出面板显示框架总分（如 "74/100"）
**And** 显示"维度明细"可折叠按钮
**When** 用户点击"维度明细"
**Then** 展开显示所有维度的分数列表
**And** 每个维度显示：圆点颜色编码、维度名称、分数

**Example**:
```
健康度分析 74/100

维度明细 ▼
  🔴 问题        85/100
  🟢 解决方案     90/100
  🟡 独特价值     70/100
  🔵 客户细分     80/100
  ...
```

#### Scenario: 维度分数颜色编码

**Given** 维度分数不同
**When** 界面渲染维度列表
**Then** 分数 ≥ 85 显示绿色圆点
**And** 分数 ≥ 70 显示蓝色圆点
**And** 分数 ≥ 50 显示黄色圆点
**And** 分数 < 50 显示红色圆点

---

### Requirement: 健康度流式更新

健康度分析过程中，维度分数 SHALL 逐个流式更新到界面。

#### Scenario: 流式更新维度分数

**Given** 用户触发健康度分析
**When** AI 逐个评估维度
**Then** 每完成一个维度评估，界面立即更新该维度的分数
**And** 显示加载动画表示正在评估的维度
**And** 所有维度评估完成后显示框架总分

---

## REMOVED Requirements

### Requirement: 节点健康度统计

健康度面板不再显示节点级别的统计信息。

#### Scenario: 移除"节点已评分"统计

**Given** 用户查看健康度面板
**When** 界面渲染健康度信息
**Then** 不显示"82 个节点已评分"等统计信息
**And** 仅显示框架总分和维度明细

---

## MODIFIED Requirements

### Requirement: 健康度面板数据源

健康度面板 SHALL 从 `ProjectFramework.healthScore` 和 `ProjectFrameworkHealthDimension` 表获取数据。

#### Scenario: 加载健康度数据

**Given** Canvas 页面加载
**When** 系统获取当前框架的健康度数据
**Then** 从 `ProjectFramework` 表读取 `healthScore` 字段作为总分
**And** 从 `ProjectFrameworkHealthDimension` 表读取所有维度分数
**And** 使用 JOIN 查询一次性获取所有数据
**And** 响应时间 < 200ms

#### Scenario: 切换框架加载不同健康度

**Given** 用户在 Lean Canvas 框架
**When** 用户切换到 Business Canvas 框架
**Then** 健康度面板重新加载 Business Canvas 的健康度数据
**And** 显示不同的总分和维度列表
**And** 维度数量和名称与框架定义一致
