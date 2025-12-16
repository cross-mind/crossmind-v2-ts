# 设计文档：会话式健康度分析系统

## Context

当前系统存在的问题：
1. **框架数据架构混乱**：CanvasNode 直接关联平台级 Framework，缺少项目隔离
2. **批量分析模式**：AI 一次性读取所有数据，无法自主探索
3. **缺少过程可视化**：用户只能看到结果，不了解 AI 分析思路
4. **建议展示单一**：只有列表形式，缺少交互性

技术约束：
- 基于 Vercel AI SDK v5 + Drizzle ORM
- 复用现有 ChatSession 和 DataStream 基础设施
- 保持与现有 Canvas 系统的兼容性

## Goals / Non-Goals

**Goals:**
- 实现项目级框架快照，彻底隔离平台与项目数据
- AI 通过工具自主探索区域和节点，按需加载数据
- 用户可实时查看 AI 分析过程和生成的建议
- 支持多轮对话，用户可针对建议提问和调整
- 健康度维度评分可由 AI 更新，提供量化反馈

**Non-Goals:**
- 不实现实时协作（多用户同时分析）
- 不支持自定义健康度维度（维度由平台预设）
- 不保留旧批量分析 API（彻底迁移）

## Decisions

### Decision 1: 项目框架快照架构

**方案**：平台级 Framework → 项目级 ProjectFramework 快照

**理由**：
- **数据隔离**：项目数据不受平台框架更新影响
- **可追溯性**：保留创建时的框架结构，支持审计
- **灵活性**：未来可支持用户自定义框架（fork 平台框架）

**实现**：
- Framework 表：平台级数据，管理员维护
- ProjectFramework 表：项目创建时复制，含 sourceFrameworkId 追踪来源
- 迁移策略：为现有项目生成快照，保持向后兼容

**替代方案**（已拒绝）：
- 直接关联 Framework：无法应对平台更新，数据混乱
- 软删除 + 版本号：复杂度高，查询性能差

### Decision 2: ChatSession 类型扩展

**方案**：复用 ChatSession 表，增加 `type` 和 `status` 字段

**理由**：
- **统一基础设施**：复用现有 Message_v2 和 DataStream 系统
- **简化查询**：通过 type 字段过滤，避免多表 JOIN
- **灵活扩展**：未来可增加其他会话类型（code-review, design-feedback 等）

**实现**：
```typescript
type: "chat" | "health-analysis"
status: "active" | "archived"
```

**替代方案**（已拒绝）：
- 新建 HealthAnalysisSession 表：增加复杂度，重复逻辑
- 不区分类型：无法过滤侧边栏显示

### Decision 3: AI 工具设计模式

**方案**：4 个独立工具，按职责分离

| 工具 | 职责 | 副作用 |
|------|------|--------|
| viewFrameworkZones | 查看框架结构 | 无 |
| viewNode | 查看节点详情 | 无 |
| createSuggestion | 创建建议 | DB 写入 + 流式更新 |
| updateFrameworkHealth | 更新健康度 | DB 写入 + 流式更新 |

**理由**：
- **单一职责**：每个工具功能明确，易于测试
- **按需加载**：AI 只调用需要的工具，减少数据传输
- **流式友好**：查询工具无副作用，修改工具有流式反馈

**替代方案**（已拒绝）：
- 合并为单个 analyzeCanvas 工具：粒度太粗，AI 缺少控制力
- 批量查询工具（getNodes）：失去会话式交互优势

### Decision 4: Artifact 类型选择

**方案**：新增 `health-suggestion` artifact kind

**理由**：
- **独立展示区**：artifact 在侧边栏独立显示，不干扰对话流
- **累积更新**：支持流式追加建议，实时反馈进度
- **交互操作**：每个建议卡片支持应用/忽略操作

**数据结构**：
```typescript
content: JSON.stringify([
  { suggestionId, type, title, description, priority, actionParams },
  // ...
])
```

**替代方案**（已拒绝）：
- 内联消息展示：建议多时会淹没对话
- 自定义 UI 组件：artifact 系统已提供基础设施

### Decision 5: 健康度维度管理

**方案**：平台级定义 + 项目级评分

**架构**：
- FrameworkHealthDimension：平台预设维度（coverage, clarity, balance 等）
- ProjectFrameworkHealthDimension：项目快照 + AI 评分（score, insights）

**评分流程**：
1. AI 调用 updateFrameworkHealth 工具
2. 传入 dimensionScores 映射（如 `{coverage: 85, clarity: 90}`）
3. 系统更新各维度分数 + 计算加权总分
4. 流式反馈更新进度

**配置管理**：
```json
// config/frameworks.json
{
  "healthDimensions": [
    {
      "dimensionKey": "coverage",
      "name": "覆盖度",
      "weight": 0.3,
      "evaluationCriteria": { ... }
    }
  ]
}
```

## Risks / Trade-offs

### Risk 1: 数据迁移失败

**影响**：现有项目无法使用健康度分析

**缓解措施**：
- 生产环境执行前在测试环境完整验证
- 备份数据库，准备回滚脚本
- 迁移脚本支持幂等性（重复执行安全）

### Risk 2: JSONB 字段兼容性

**问题**：`positions` 和 `zoneAffinities` 的 key 需从 frameworkId 改为 projectFrameworkId

**缓解措施**：
- 迁移脚本自动重写 JSONB 字段
- 保留 sourceFrameworkId 作为映射参考
- 前端兼容两种格式（过渡期）

### Risk 3: AI 工具调用性能

**问题**：AI 频繁调用 viewNode 可能导致延迟

**缓解措施**：
- 查询函数优化（索引、批量查询）
- 前端显示加载状态，提升感知性能
- 限制单次会话工具调用次数（如最多 50 次）

### Risk 4: 流式更新丢失

**问题**：网络中断导致建议未显示

**缓解措施**：
- 先保存 DB，再流式发送（DB 为准）
- 会话重新打开时从 DB 加载建议
- transient: false 确保持久化

## Migration Plan

### Phase 1: 数据准备（无停机）
1. 创建新表（ProjectFramework, ProjectFrameworkZone 等）
2. 导入平台级配置数据
3. 为现有项目生成框架快照
4. 验证数据完整性

### Phase 2: 代码部署（计划停机 5 分钟）
1. 部署新代码（包含新旧 API）
2. 执行 CanvasNode 和 CanvasSuggestion 迁移
3. 验证迁移结果

### Phase 3: 清理（无停机）
1. 删除旧 API 代码
2. 清理前端调用
3. 可选：删除旧的 frameworkId 列

### Rollback Plan
1. 保留旧表结构 30 天
2. 回滚代码到迁移前版本
3. 恢复数据库快照

## Open Questions

1. **健康度分数缓存**：是否需要 Redis 缓存？
   - 建议：初期不缓存，观察性能后决定

2. **会话并发限制**：用户是否可同时发起多个健康分析？
   - 建议：同一框架只允许 1 个 active 会话

3. **历史会话保留期**：archived 会话保留多久？
   - 建议：无限期保留，用户可手动删除
