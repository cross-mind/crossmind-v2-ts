# Capability: 会话式健康度分析

## ADDED Requirements

### Requirement: 健康分析会话管理

系统 SHALL 支持创建、归档和查询健康度分析会话，每个项目框架只允许一个活跃会话。

#### Scenario: 创建新的健康分析会话
- **WHEN** 用户发起健康度分析
- **THEN** 系统创建 ChatSession（type="health-analysis", status="active"）
- **AND** 归档该项目框架下所有旧的活跃会话（status="archived"）
- **AND** 返回 sessionId 和初始引导消息

#### Scenario: 查询活跃会话
- **WHEN** 用户打开健康度详情页
- **THEN** 系统查询该框架的活跃会话（type="health-analysis", status="active"）
- **AND** 若存在则返回会话 ID 和消息历史
- **AND** 若不存在则返回空，允许创建新会话

#### Scenario: 归档会话
- **WHEN** 创建新会话时
- **THEN** 所有同框架的旧活跃会话 status 更新为 "archived"
- **AND** 设置 archivedAt 时间戳
- **AND** 归档的会话仍可查看，但不可继续对话

### Requirement: AI 工具 - 查看框架区域

系统 SHALL 提供 viewFrameworkZones 工具，允许 AI 查看项目框架的区域结构和节点标题列表。

#### Scenario: 查看默认框架区域
- **WHEN** AI 调用 viewFrameworkZones 不传 projectFrameworkId
- **THEN** 返回项目当前活跃框架的区域列表
- **AND** 每个区域包含：id, name, description
- **AND** 每个区域包含节点标题列表：[{id, title}]

#### Scenario: 查看指定框架区域
- **WHEN** AI 调用 viewFrameworkZones 并传入 projectFrameworkId
- **THEN** 返回指定框架的区域列表和节点
- **AND** 节点根据 zoneAffinities JSONB 字段过滤

### Requirement: AI 工具 - 查看节点详情

系统 SHALL 提供 viewNode 工具，允许 AI 查看节点的完整详情，包含内容、活动历史和评论。

#### Scenario: 查看节点完整信息
- **WHEN** AI 调用 viewNode 并传入 nodeId
- **THEN** 返回节点的所有字段：title, content, type, tags, healthScore, healthLevel, healthData
- **AND** 返回活动记录数组：[{type, description, createdAt}]
- **AND** 返回评论数组：[{content, authorId, createdAt}]

#### Scenario: 节点不存在或无权限
- **WHEN** AI 调用 viewNode 传入不存在的 nodeId
- **THEN** 返回错误：{ error: "Node not found" }

### Requirement: AI 工具 - 创建建议

系统 SHALL 提供 createSuggestion 工具，允许 AI 逐个创建改进建议，并流式更新到 UI。

#### Scenario: 创建节点级建议
- **WHEN** AI 调用 createSuggestion 并传入 nodeId, type, title, description, priority, actionParams
- **THEN** 系统保存建议到 CanvasSuggestion 表
- **AND** 设置 chatSessionId 为当前会话
- **AND** 流式发送 artifact 更新：{ type: "health-suggestion", data: {...} }
- **AND** 返回 suggestionId 和确认消息

#### Scenario: 创建全局建议（canvas 级别）
- **WHEN** AI 调用 createSuggestion 不传 nodeId
- **THEN** 建议的 nodeId 字段为 null
- **AND** 建议适用于整个 canvas 而非特定节点

#### Scenario: 流式更新 artifact
- **WHEN** AI 创建建议
- **THEN** dataStream.write() 发送 health-suggestion 类型数据
- **AND** 前端 artifact 实时追加新建议到列表
- **AND** transient: false 确保数据持久化

### Requirement: AI 工具 - 更新框架健康度

系统 SHALL 提供 updateFrameworkHealth 工具，允许 AI 更新框架的健康度维度评分和总分。

#### Scenario: 更新多个维度评分
- **WHEN** AI 调用 updateFrameworkHealth 并传入 projectFrameworkId, dimensionScores, overallScore, insights
- **THEN** 系统遍历 dimensionScores 映射（如 {coverage: 85, clarity: 90}）
- **AND** 更新 ProjectFrameworkHealthDimension 表的 score 和 insights 字段
- **AND** 每更新一个维度，流式发送 dimension-score 更新
- **AND** 更新 ProjectFramework.healthScore 和 lastHealthCheckAt
- **AND** 流式发送 framework-health 总分更新

#### Scenario: 维度不存在
- **WHEN** AI 传入的 dimensionKey 在项目框架中不存在
- **THEN** 跳过该维度，记录警告日志
- **AND** 继续处理其他有效维度

### Requirement: Artifact 类型 - 健康建议

系统 SHALL 支持 "health-suggestion" artifact 类型，用于展示 AI 生成的建议列表。

#### Scenario: 渲染建议列表
- **WHEN** artifact 类型为 "health-suggestion"
- **THEN** 解析 content JSON 为建议数组
- **AND** 每个建议渲染为卡片：显示 title, description, reason, priority
- **AND** 卡片支持"应用"和"忽略"操作按钮

#### Scenario: 流式更新累积建议
- **WHEN** 收到新的 health-suggestion data stream
- **THEN** 追加到现有 suggestions 数组
- **AND** 更新 artifact content 为 JSON.stringify(suggestions)
- **AND** 自动滚动到最新建议

#### Scenario: 应用建议
- **WHEN** 用户点击"应用"按钮
- **THEN** 调用 POST /api/canvas/suggestion/apply
- **AND** 执行建议的 actionParams（调用 executeSuggestion）
- **AND** 更新建议 status 为 "accepted"
- **AND** 刷新 artifact 显示

### Requirement: 会话不在侧边栏显示

系统 SHALL 过滤健康分析会话，使其不出现在侧边栏的常规聊天列表中。

#### Scenario: 侧边栏只显示普通聊天
- **WHEN** 查询聊天列表用于侧边栏
- **THEN** WHERE 条件包含 type="chat"
- **AND** 健康分析会话（type="health-analysis"）被过滤掉

#### Scenario: 从健康度详情页跳转
- **WHEN** 用户在健康度详情页点击"查看分析"
- **THEN** 跳转到会话页面，显示该会话的消息历史
- **AND** URL 包含 sessionId 参数
