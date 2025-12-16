# Change: 将 AI 健康度分析重构为会话式交互系统

## Why

当前的健康度分析功能采用批量生成模式，一次性读取所有区域和节点数据，AI 无法根据实际情况自主探索和分析。用户也无法查看分析过程，只能看到最终的建议列表。

改为会话式交互后：
- AI 可以自主决定查看哪些区域和节点，逐步深入分析
- 用户可以实时观察 AI 的分析思路和过程
- 建议以 artifact 形式在会话中展示，支持随时查看和操作
- 支持多轮对话，用户可以针对建议提问或要求调整

## What Changes

- **新增项目框架快照系统**：框架从平台级数据复制到项目级（ProjectFramework, ProjectFrameworkZone 表）
- **新增健康度维度管理**：平台级维度定义 + 项目级评分存储（FrameworkHealthDimension, ProjectFrameworkHealthDimension 表）
- **扩展 ChatSession**：增加 `type` 和 `status` 字段，支持健康分析专用会话
- **新增 4 个 AI 工具**：viewFrameworkZones, viewNode, createSuggestion, updateFrameworkHealth
- **新增 artifact 类型**：health-suggestion，支持流式更新建议列表
- **配置文件管理**：平台级框架和维度数据用 JSON 配置文件维护
- **数据迁移**：现有 CanvasNode 关联从平台框架迁移到项目框架
- **删除旧实现**：移除 `/api/canvas/suggestions/generate` 及相关代码

**BREAKING**:
- CanvasNode.frameworkId 改为 projectFrameworkId，需要数据迁移
- CanvasSuggestion.frameworkId 改为 projectFrameworkId
- 删除批量建议生成 API

## Impact

- **影响的 specs**:
  - health-analysis-chat（新增）：会话式健康度分析系统
  - project-framework-snapshot（新增）：项目框架快照管理

- **影响的代码**:
  - lib/db/schema.ts：新增 4 个表，扩展 3 个表
  - lib/db/queries.ts：新增 15+ 查询函数
  - lib/ai/tools/：新增 4 个工具文件
  - app/api/canvas/health-analysis/：新增会话管理 API
  - components/artifact.tsx：扩展 artifact 类型
  - 删除：app/api/canvas/suggestions/generate/route.ts

- **数据迁移**:
  - 为现有项目创建框架快照
  - 更新 CanvasNode 和 CanvasSuggestion 的框架关联
  - 导入平台级配置数据

- **用户影响**:
  - 健康度分析入口改为"发起会话"
  - 可查看历史分析会话（归档状态）
  - 建议在会话中实时生成和展示
