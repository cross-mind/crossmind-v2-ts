# Capability: 项目框架快照管理

## ADDED Requirements

### Requirement: 项目框架快照创建

系统 SHALL 在项目创建时自动复制平台级框架数据到项目级，形成独立快照。

#### Scenario: 项目创建时生成快照
- **WHEN** 创建新项目并选择默认框架
- **THEN** 从 Framework 表复制框架元数据到 ProjectFramework
- **AND** 设置 sourceFrameworkId 追踪来源
- **AND** 从 FrameworkZone 表复制所有区域到 ProjectFrameworkZone
- **AND** 从 FrameworkHealthDimension 表复制维度定义到 ProjectFrameworkHealthDimension
- **AND** 项目框架独立于平台框架，后续平台更新不影响项目

#### Scenario: 手动创建框架快照
- **WHEN** 用户请求为项目添加新框架
- **THEN** POST /api/canvas/framework/snapshot
- **AND** 传入 projectId 和 sourceFrameworkId
- **AND** 执行快照复制逻辑
- **AND** 返回新的 projectFrameworkId

### Requirement: 区域节点关联

系统 SHALL 通过 JSONB 字段 zoneAffinities 管理节点与项目框架区域的关联关系。

#### Scenario: 查询区域的节点列表
- **WHEN** 查询 ProjectFrameworkZone 的节点
- **THEN** 查询 CanvasNode.zoneAffinities JSONB 字段
- **AND** 过滤出 zoneAffinities[projectFrameworkId][zoneKey] > 0 的节点
- **AND** 返回节点的 id 和 title

#### Scenario: 更新节点的区域关联
- **WHEN** 节点移动到新区域
- **THEN** 更新 CanvasNode.zoneAffinities[projectFrameworkId][zoneKey] 权重
- **AND** 权重范围 0-1，表示节点与区域的关联强度

### Requirement: 健康度维度管理

系统 SHALL 支持平台级维度定义和项目级评分存储的分离架构。

#### Scenario: 平台级维度定义
- **WHEN** 管理员配置框架的健康度维度
- **THEN** 维度存储在 FrameworkHealthDimension 表
- **AND** 包含 dimensionKey, name, description, weight, evaluationCriteria
- **AND** evaluationCriteria 为 JSONB，定义各分数段的标准（excellent, good, warning, critical）

#### Scenario: 项目级维度评分
- **WHEN** 项目创建时
- **THEN** 复制维度定义到 ProjectFrameworkHealthDimension
- **AND** 初始 score 为 null（未评分）
- **AND** AI 调用 updateFrameworkHealth 后更新 score 字段
- **AND** 记录 insights 和 lastUpdatedAt

#### Scenario: 计算框架总分
- **WHEN** 更新所有维度评分后
- **THEN** 根据维度权重计算加权平均分
- **AND** 公式：overallScore = Σ(dimension.score * dimension.weight)
- **AND** 更新 ProjectFramework.healthScore

### Requirement: 平台级数据配置文件管理

系统 SHALL 使用 JSON 配置文件管理平台级框架和维度数据，支持种子数据导入。

#### Scenario: 导入框架配置
- **WHEN** 执行种子数据导入脚本
- **THEN** 读取 config/frameworks.json
- **AND** 检查 Framework 表是否已存在同名框架
- **AND** 若不存在则插入 Framework, FrameworkZone, FrameworkHealthDimension
- **AND** 支持幂等性（重复执行安全）

#### Scenario: 配置文件结构
- **WHEN** 定义框架配置
- **THEN** JSON 结构包含：
  ```json
  {
    "frameworks": [
      {
        "id": "lean-canvas",
        "name": "精益画布",
        "icon": "LayoutGrid",
        "description": "...",
        "zones": [...],
        "healthDimensions": [...]
      }
    ]
  }
  ```
- **AND** zones 包含 zoneKey, name, description, colorKey, displayOrder
- **AND** healthDimensions 包含 dimensionKey, name, weight, evaluationCriteria

### Requirement: 数据迁移

系统 SHALL 提供迁移脚本，将现有 CanvasNode 的框架关联从平台级迁移到项目级。

#### Scenario: 迁移现有项目数据
- **WHEN** 执行数据迁移脚本
- **THEN** 为每个项目创建 ProjectFramework 快照（基于 Project.defaultFrameworkId）
- **AND** 复制 FrameworkZone 到 ProjectFrameworkZone
- **AND** 复制 FrameworkHealthDimension 到 ProjectFrameworkHealthDimension
- **AND** 更新 CanvasNode.projectFrameworkId 指向新的项目框架
- **AND** 重写 CanvasNode.zoneAffinities JSONB 的 key（frameworkId → projectFrameworkId）
- **AND** 更新 CanvasSuggestion.projectFrameworkId

#### Scenario: 迁移失败回滚
- **WHEN** 迁移过程出现错误
- **THEN** 事务回滚，数据保持原状
- **AND** 记录详细错误日志
- **AND** 保留旧表结构不删除（备份期 30 天）

### Requirement: 查询优化

系统 SHALL 为项目框架相关表创建必要的索引，优化查询性能。

#### Scenario: 复合索引
- **WHEN** 查询项目的活跃框架
- **THEN** 使用索引：idx_project_framework_project (projectId, isActive)
- **AND** 查询区域时使用：idx_project_framework_zone_unique (projectFrameworkId, zoneKey)
- **AND** 查询维度时使用：idx_project_framework_dimension_unique (projectFrameworkId, dimensionKey)

#### Scenario: JSONB 索引
- **WHEN** 查询节点的区域关联
- **THEN** CanvasNode.zoneAffinities 使用 GIN 索引
- **AND** 支持高效的 JSONB 键值查询
