# 标签系统 - 需求设计文档

> 📖 **相关文档**：[PRD](../../PRD.md) | [Canvas 核心](./05-canvas-core.md) | [任务管理](./07-task-management.md)

**文档版本**: 1.0
**最后更新**: 2024-12-08
**负责人**: 产品团队

---

## 1. 模块概述

### 1.1 模块定位

**核心价值**: 统一的标签系统，支持 Canvas 和任务中心的多维度组织和过滤。

**使用场景**:
- 多维度分类：按类型、阶段、优先级等分类
- 快速过滤：找到特定标签的所有内容
- 进度追踪：查看某阶段的所有任务

### 1.2 模块边界

**包含功能**:
- Namespace 体系设计
- 标签 CRUD
- 标签过滤和搜索
- Canvas 和 Task 标签一致性

**被依赖**: Canvas 核心、任务管理核心

### 1.3 优先级

- **P0**: 预设 namespace、标签CRUD、基础过滤
- **P1**: 自定义 namespace、高级过滤
- **P2**: 标签分析、智能推荐

---

## 2. 核心用户场景

### 场景 2.1: 为节点添加标签

**基本流程**:
```
用户编辑 Canvas 节点
    ↓
点击"添加标签"
    ↓
输入 "type/"，弹出自动补全：type/idea, type/research...
    ↓
选择 type/idea
    ↓
继续添加 stage/ideation
    ↓
保存
```

### 场景 2.2: 按标签过滤

**基本流程**:
```
用户在任务中心点击过滤器
    ↓
选择标签 priority/high
    ↓
任务列表只显示高优先级任务
    ↓
继续添加 stage/dev
    ↓
显示"开发阶段的高优先级任务"
```

---

## 3. 功能详细设计

### 3.1 Namespace 体系

#### 3.1.1 预设 Namespace（MVP: 精简为 3 个核心）

| Namespace | 值 | 适用对象 | 使用场景 | 优先级 |
|-----------|---|---------|---------|-------|
| `type` | idea/decision/bug/feature/doc | Canvas/Task | 内容类型分类 | P0 |
| `stage` | ideation/research/design/dev/launch | Canvas/Task | 项目阶段分类 | P0 |
| `priority` | low/medium/high/urgent | Task | 任务优先级 | P0 |

**说明**:
- **MVP 只保留 3 个最核心的 namespace**，降低学习成本
- 其他分类需求通过自定义标签满足
- V1.0 可根据用户反馈逐步增加 namespace

#### 3.1.2 移除的 Namespace 及替代方案

| 原 Namespace | 替代方案 | 优先级 |
|------------|---------|-------|
| `level` | 用层级结构（父子节点）表示 | V1.0 |
| `risk` | 用自定义标签 `blocked`、`high-risk` | V1.0 |
| `skill` | 用自定义标签 `design`、`frontend` 等 | V1.0 |
| `integration` | 用自定义标签 `github`、`stripe` 等 | V1.0 |

#### 3.1.2 自定义 Namespace (P1)

**创建规则**:
- 用户可创建自定义 namespace
- 格式：`custom_namespace/value`
- 建议不超过 10 个

### 3.2 标签操作

#### 3.2.1 创建标签

**方式**:
- 预设标签：从列表选择
- 自定义标签：直接输入

**格式**:
- 带 namespace：`stage/design`
- 不带 namespace：`urgent`（自动归类为无 namespace）

**优先级**: P0

#### 3.2.2 标签自动补全

**触发**: 输入标签时实时匹配

**匹配规则**:
- 输入 `st`，匹配所有包含 `st` 的标签
- 输入 `stage/`，列出所有 stage namespace 下的值
- 按使用频率排序

**优先级**: P0

#### 3.2.3 标签编辑和删除

**编辑**: 修改标签名称，自动更新所有使用处

**删除**: 删除标签，提示"{N} 个节点/任务使用此标签，是否移除？"

**优先级**: P1

### 3.3 标签过滤和搜索

#### 3.3.1 单标签过滤

**操作**: 点击标签即过滤

**效果**: 显示所有包含该标签的内容

**优先级**: P0

#### 3.3.2 多标签组合过滤

**AND 逻辑**: 同时满足多个标签
- 示例：`priority/high` AND `stage/dev`

**OR 逻辑** (P1): 满足任一标签
- 示例：`priority/high` OR `priority/urgent`

**优先级**: P0 (AND), P1 (OR)

#### 3.3.3 按 Namespace 分组

**展示**: 过滤器按 namespace 分组显示

```
类型 (type)
  ☑ idea (15)
  ☐ research (8)
  ☐ prototype (5)

阶段 (stage)
  ☐ ideation (10)
  ☑ design (12)
  ☐ dev (20)
```

**优先级**: P1

### 3.4 Canvas 和 Task 标签一致性

#### 共享标签池

**规则**:
- Canvas 和 Task 共享同一标签池
- 在 Canvas 创建的标签可在 Task 使用
- 标签统计合并计算

**同步**:
- 标签修改自动同步到所有使用处
- 标签删除同时移除 Canvas 和 Task

**优先级**: P0

---

## 4. 业务规则与逻辑

### 4.1 标签约束

**数量限制**:
- 单个节点/任务最多 20 个标签
- 单个项目最多 200 个不同标签

**格式规则**:
- 标签名长度：1-50 字符
- 支持字母、数字、中文、-、_、/
- 不区分大小写

### 4.2 预设标签规则

**不可删除**: 预设 namespace 的标签不可删除（可隐藏）

**自动创建**: 用户首次使用预设标签时自动创建

---

## 5. 状态与数据流

### 5.1 标签数据结构

```typescript
interface Tag {
  id: string
  namespace?: string  // 可选，如 'stage'
  value: string       // 如 'design'
  fullName: string    // 'stage/design' 或 'urgent'
  count: number       // 使用次数
  projectId: string
}
```

---

## 6. 验收标准

### 6.1 功能验收

- [ ] 预设标签正常使用
- [ ] 标签自动补全准确
- [ ] 单标签过滤正确
- [ ] 多标签 AND 过滤正确
- [ ] Canvas 和 Task 标签同步

### 6.2 性能指标

| 指标 | 目标值 |
|-----|-------|
| 标签搜索响应 | < 200ms |
| 过滤结果显示 | < 500ms |

---

## 附录

### A. 术语表

| 术语 | 定义 |
|-----|-----|
| Namespace | 标签的分类维度 |
| 预设标签 | 系统预定义的标签 |
| 自定义标签 | 用户自己创建的标签 |

### B. 标签命名规范

**推荐格式**: `namespace/value`

**示例**:
- `stage/research`
- `priority/high`
- `type/bug`

### C. 变更历史

| 版本 | 日期 | 变更内容 | 负责人 |
|-----|------|---------|-------|
| 1.0 | 2024-12-08 | 初始版本 | 产品团队 |
