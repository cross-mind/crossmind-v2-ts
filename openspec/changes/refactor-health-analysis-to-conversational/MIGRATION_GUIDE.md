# 健康度分析迁移指南

## 概述

本迁移将系统从批量健康度分析模式迁移到会话式交互模式，包含以下变更：

**数据库变更：**
- 新增 4 个表：ProjectFramework, ProjectFrameworkZone, FrameworkHealthDimension, ProjectFrameworkHealthDimension
- 扩展 3 个表：ChatSession, CanvasNode, CanvasSuggestion
- 数据迁移：创建项目级框架快照，更新节点和建议关联

**架构变更：**
- Framework 数据从平台级迁移到项目级快照
- 健康度分析从批量生成改为 AI 会话式探索
- 建议以 artifact 形式在对话中展示

## 前置条件

1. **备份数据库**（必须）
   ```bash
   # 使用 pg_dump 备份
   pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **确认环境变量**
   ```bash
   # 检查 .env.local 中的数据库连接
   cat .env.local | grep POSTGRES_URL
   ```

3. **停止开发服务器**
   ```bash
   # 确保没有正在运行的服务器
   pkill -f "next dev"
   ```

## 迁移步骤

### 方法 1：一键迁移（推荐）

使用 TypeScript 迁移脚本，自动处理所有步骤：

```bash
# 1. 推送 schema 变更
pnpm db:push

# 2. 运行迁移脚本（包含数据迁移 + 平台框架导入）
npx tsx scripts/run-health-analysis-migration.ts
```

**预期输出：**
```
========================================
Health Analysis Migration
========================================

[Step 1/2] Running data migration...
[Migration] Starting project framework snapshot migration...
[Migration] Found X projects with default frameworks
[Migration] Processing project: Project Name (uuid)
  - Created project framework: uuid
  - Copied Y zones
  - Updated Z nodes
  - Updated N suggestions
✓ Data migration completed
  - Projects: X
  - Frameworks: X
  - Zones: Y
  - Nodes: Z
  - Suggestions: N

[Step 2/2] Seeding platform frameworks...
[Seed] 框架 "Lean Canvas" 已存在，跳过
✓ Platform frameworks seeded

========================================
✓ Migration completed successfully!
========================================
```

### 方法 2：分步执行

如果需要更细粒度的控制：

```bash
# Step 1: 推送 schema 变更
pnpm db:push

# Step 2: 运行数据迁移
npx tsx lib/db/migrations/data/0012_migrate_project_frameworks.ts

# Step 3: 导入平台框架
npx tsx -e "
import { seedPlatformFrameworks } from './lib/db/seed-frameworks.ts';
await seedPlatformFrameworks();
console.log('✓ Seeding completed');
"
```

### 方法 3：使用 Shell 脚本（Unix/Linux/macOS）

```bash
# 赋予执行权限（仅首次）
chmod +x scripts/run-health-analysis-migration.sh

# 运行迁移
./scripts/run-health-analysis-migration.sh
```

## 验证迁移

### 1. 数据库结构验证

```sql
-- 检查新表是否创建
SELECT table_name
FROM information_schema.tables
WHERE table_name IN (
  'ProjectFramework',
  'ProjectFrameworkZone',
  'FrameworkHealthDimension',
  'ProjectFrameworkHealthDimension'
);

-- 检查 ChatSession 新字段
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ChatSession'
  AND column_name IN ('type', 'status', 'projectFrameworkId', 'archivedAt');
```

### 2. 数据迁移验证

```sql
-- 检查创建的项目框架数量
SELECT COUNT(*) as framework_count FROM "ProjectFramework";

-- 检查区域复制情况
SELECT
  pf.name as framework_name,
  COUNT(pfz.id) as zone_count
FROM "ProjectFramework" pf
LEFT JOIN "ProjectFrameworkZone" pfz ON pfz."projectFrameworkId" = pf.id
GROUP BY pf.name;

-- 检查节点更新情况
SELECT COUNT(*) as nodes_with_framework
FROM "CanvasNode"
WHERE "projectFrameworkId" IS NOT NULL;

-- 检查建议更新情况
SELECT COUNT(*) as suggestions_with_framework
FROM "CanvasSuggestion"
WHERE "projectFrameworkId" IS NOT NULL;
```

### 3. 功能验证

```bash
# 启动开发服务器
pnpm dev

# 测试健康度分析 API
curl -X POST http://localhost:8000/api/canvas/health-analysis/start \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id", "projectFrameworkId": "your-framework-id"}'
```

## 常见问题

### Q1: 迁移失败，如何回滚？

**A:** 从备份恢复数据库：

```bash
# 恢复备份
psql $POSTGRES_URL < backup_YYYYMMDD_HHMMSS.sql

# 回滚 schema 变更（如果需要）
# 1. 恢复 schema.ts 到迁移前版本
# 2. 运行 pnpm db:push
```

### Q2: 部分项目迁移失败怎么办？

**A:** 查看错误日志，手动修复：

```typescript
// 迁移脚本会继续处理其他项目
// 查看 stats.errors 数组获取失败的项目ID
// 手动检查这些项目的数据完整性
```

### Q3: 迁移后旧数据还能访问吗？

**A:** 是的，但需要注意：
- 旧的 `frameworkId` 字段已重命名为 `projectFrameworkId`
- 旧的节点位置数据（positions JSONB）仍然保留
- zoneAffinities 的 key 已从平台 frameworkId 更新为项目 projectFrameworkId

### Q4: 迁移需要多长时间？

**A:** 取决于数据量：
- Schema 变更：< 10 秒
- 数据迁移：约 1-5 秒/项目
- 平台框架导入：< 1 秒

示例：100 个项目约需 2-5 分钟

## 迁移后清理

### 可选：生成生产环境迁移文件

如果需要在生产环境使用传统的 Drizzle 迁移：

```bash
# 生成迁移文件
pnpm db:generate

# 选择 "rename column" 选项（frameworkId → projectFrameworkId）
```

### 移除旧代码（待办）

迁移成功后，可删除以下文件：
- `app/api/canvas/suggestions/generate/route.ts`（旧的批量生成 API）
- `lib/ai/prompts/suggestion-prompts.ts`（旧的提示词）

## 故障排除

### 已知问题及解决方案

#### 1. 缺失列错误

**问题**：执行迁移时报错 `column "displayOrder" does not exist` 或 `column "sourceZoneId" does not exist`

**原因**：SQL 迁移脚本与 schema.ts 定义不完全一致

**解决方案**：运行修复脚本
```bash
# 修复 ProjectFrameworkZone 缺失列
npx tsx scripts/fix-zone-columns.ts

# 修复 FrameworkHealthDimension 缺失列
npx tsx scripts/fix-dimension-columns.ts
```

#### 2. 区域未复制

**问题**：ProjectFrameworkZone 表记录为 0

**原因**：重复运行迁移时，框架已存在导致跳过区域复制逻辑

**解决方案**：数据迁移脚本已修复为幂等性设计（v2），即使框架存在也会检查并复制缺失的区域

#### 3. 种子数据导入失败

**问题**：`Cannot find module './drizzle'`

**原因**：seed-frameworks.ts 导入了不存在的 drizzle.ts 文件

**解决方案**：已修复为直接创建 postgres 连接
```typescript
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);
```

### 验证迁移成功

运行验证脚本检查数据完整性：
```bash
npx tsx scripts/verify-migration.ts
```

预期输出：
- ProjectFramework records: 2（项目数量）
- ProjectFrameworkZone records: 13（总区域数）
- CanvasSuggestion with projectFrameworkId: > 0

## 技术细节

### 数据迁移逻辑

1. **创建项目框架快照**
   - 从 `Project.defaultFrameworkId` 引用的平台框架创建副本
   - 复制框架的 name, icon, description 字段
   - 设置 `sourceFrameworkId` 指向原始��台框架

2. **复制区域定义**（幂等性）
   - 检查 ProjectFrameworkZone 是否已存在
   - 如不存在，从平台 `FrameworkZone` 复制到 `ProjectFrameworkZone`
   - 保留 zoneKey, name, description, colorKey, displayOrder
   - 设置 sourceZoneId 指向原始区域

3. **更新节点关联**
   - 检查节点的 `positions` JSONB 是否包含该框架的位置数据
   - 如果有，设置 `projectFrameworkId`
   - 重写 `zoneAffinities` 的 key（frameworkId → projectFrameworkId）

4. **更新建议关联**
   - 将项目下所有建议的 `projectFrameworkId` 更新为项目框架 ID

### 幂等性

迁移脚本支持重复执行：
- 框架快照：检查是否已存在，跳过重复创建
- 节点/建议：每次都会更新（幂等）

### 错误处理

- 单个项目失败不会中断整体迁移
- 错误记录在 `stats.errors` 数组中
- 日志输出到控制台，便于调试

## 支持

如遇到问题，请查看：
- 迁移日志输出
- 数据库错误日志
- lib/db/migrations/data/README.md

或联系开发团队。
