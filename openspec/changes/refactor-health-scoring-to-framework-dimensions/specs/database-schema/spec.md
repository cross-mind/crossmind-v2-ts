# Capability: 数据库 Schema

## ADDED Requirements

### Requirement: ProjectFrameworkHealthDimension 表

数据库 MUST 包含 `ProjectFrameworkHealthDimension` 表，用于存储框架各维度的健康度分数。

#### Scenario: 创建维度健康度表

**Given** 数据库迁移脚本执行
**When** 创建 `ProjectFrameworkHealthDimension` 表
**Then** 表包含以下字段：
- `id`: UUID 主键
- `projectFrameworkId`: 外键关联 `ProjectFramework.id`，级联删除
- `dimensionKey`: 文本，对应框架 zone 的 `zoneKey`
- `score`: 实数（0-100）
- `insights`: 文本，AI 评估建议
- `createdAt`: 时间戳
- `updatedAt`: 时间戳
**And** 表包含复合唯一约束 `(projectFrameworkId, dimensionKey)`

#### Scenario: Upsert 维度分数

**Given** 框架已有某个维度的分数记录
**When** AI 更新同一维度的分数
**Then** 系统使用 `ON CONFLICT DO UPDATE` 更新现有记录
**And** `updatedAt` 字段更新为当前时间
**And** 不创建重复记录

---

## MODIFIED Requirements

### Requirement: CanvasNode 表移除健康度字段

`CanvasNode` 表 MUST 移除所有节点级别的健康度相关字段。

#### Scenario: 删除节点健康度字段

**Given** 数据迁移脚本执行
**When** 删除 `CanvasNode` 表的健康度字段
**Then** 以下字段被删除：
- `healthScore`
- `healthLevel`
- `healthData`
**And** TypeScript 类型定义同步更新

---

## ADDED Requirements

### Requirement: 数据迁移脚本

数据迁移 MUST 提供脚本将旧节点健康度数据迁移到新的维度表。

#### Scenario: 迁移现有健康度数据

**Given** `CanvasNode` 表包含 `healthData` 字段的节点
**When** 执行迁移脚本
**Then** 脚本读取节点的 `healthData.dimensions`
**And** 根据节点的 `zoneAffinities` 确定所属维度
**And** 将维度分数插入到 `ProjectFrameworkHealthDimension` 表
**And** 生成备份文件 `backup-health-data-{timestamp}.json`

#### Scenario: 迁移失败回滚

**Given** 数据迁移过程中发生错误
**When** 迁移脚本失败
**Then** 系统回滚所有 `ProjectFrameworkHealthDimension` 表的插入操作
**And** `CanvasNode` 表的健康度字段保持不变
**And** 提示用户检查错误日志
