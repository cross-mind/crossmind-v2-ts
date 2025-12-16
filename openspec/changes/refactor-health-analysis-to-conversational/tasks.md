# 实施任务清单

## 1. 数据架构重构
- [x] 1.1 定义 ProjectFramework 和 ProjectFrameworkZone 表结构
- [x] 1.2 定义 FrameworkHealthDimension 和 ProjectFrameworkHealthDimension 表
- [x] 1.3 扩展 ChatSession 表（type, status, projectFrameworkId 字段）
- [x] 1.4 调整 CanvasNode 和 CanvasSuggestion 关联字段
- [x] 1.5 编写 Drizzle 迁移脚本
- [x] 1.6 执行数据迁移（开发环境测试）✅ 已完成，13个区域已复制

## 2. 配置管理系统
- [x] 2.1 创建 config/frameworks.json 配置文件
- [x] 2.2 创建 config/health-dimensions.json 配置文件（已合并到 frameworks.json）
- [x] 2.3 实现种子数据导入函数 seedPlatformFrameworks
- [x] 2.4 导入平台级框架和维度数据 ✅ 已完成，平台框架已导入

## 3. 查询层实现
- [x] 3.1 实现 getProjectFrameworkWithZones 查询
- [x] 3.2 实现 getZonesWithNodeTitles 查询
- [x] 3.3 实现 updateProjectFrameworkDimensionScore 更新
- [x] 3.4 实现 updateProjectFrameworkHealth 更新
- [x] 3.5 实现 archiveActiveHealthSessions 和 getActiveHealthSession
- [x] 3.6 修改现有查询函数适配新的 projectFrameworkId 字段（已更新 createCanvasSuggestion）

## 4. AI 工具开发
- [x] 4.1 实现 viewFrameworkZones 工具
- [x] 4.2 实现 viewNode 工具
- [x] 4.3 实现 createSuggestion 工具（含流式更新）
- [x] 4.4 实现 updateFrameworkHealth 工具
- [x] 4.5 扩展 CustomUIDataTypes 类型定义
- [x] 4.6 注册工具到健康分析聊天路由

## 5. 会话管理 API
- [x] 5.1 实现 POST /api/canvas/health-analysis/start（创建会话）
- [x] 5.2 实现 POST /api/canvas/health-analysis/chat（AI 对话）
- [ ] 5.3 实现 GET /api/canvas/health-analysis/sessions（会话列表）
- [x] 5.4 实现会话归档机制（已在 archiveActiveHealthSessions 中实现）
- [ ] 5.5 修改侧边栏查询过滤健康分析会话

## 6. Artifact 系统扩展
- [x] 6.1 创建 healthSuggestionArtifact 定义 ✅ artifacts/health-suggestion/client.tsx
- [x] 6.2 实现 SuggestionCard 组件 ✅ 已集成在 artifact 中
- [x] 6.3 实现建议应用/忽略操作 ✅ 已在 SuggestionCard 中实现
- [x] 6.4 实现流式更新累积逻辑 ✅ onStreamPart 自动累积建议
- [x] 6.5 注册 artifact 到系统 ✅ 已注册到 components/artifact.tsx

## 7. 建议操作 API
- [x] 7.1 实现 POST /api/canvas/suggestion/apply ✅ 支持所有建议类型
- [x] 7.2 实现 POST /api/canvas/suggestion/dismiss ✅ 更新状态为 dismissed
- [x] 7.3 建议执行逻辑 ✅ 直接实现在 apply route 中

## 8. 框架快照管理
- [ ] 8.1 实现项目创建时自动生成框架快照
- [ ] 8.2 实现 POST /api/canvas/framework/snapshot（手动创建快照）
- [ ] 8.3 实现 GET /api/canvas/framework/health（健康度详情）

## 9. 清理旧实现
- [ ] 9.1 删除 app/api/canvas/suggestions/generate/route.ts
- [ ] 9.2 删除 lib/ai/prompts/suggestion-prompts.ts
- [ ] 9.3 清理前端调用旧 API 的代码
- [ ] 9.4 移除相关导入和类型定义

## 10. 测试验证
- [ ] 10.1 单元测试：AI 工具函数调用验证
- [ ] 10.2 集成测试：完整会话流程（创建 → 对话 → 生成建议 → 应用）
- [ ] 10.3 Chrome DevTools MCP 测试：UI 交互和流式更新
- [ ] 10.4 数据迁移验证：现有项目数据正确性
- [ ] 10.5 性能测试：多节点场景下的查询性能

## 11. 文档更新
- [ ] 11.1 更新 CLAUDE.md 架构说明
- [ ] 11.2 更新 API 文档
- [ ] 11.3 更新用户使用指南
