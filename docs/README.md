# CrossMind 文档中心

欢迎来到 CrossMind 项目文档中心。本文档库包含产品需求、技术架构、设计系统等完整文档。

## 📚 文档导航

### 产品文档

- **[产品需求文档 (PRD)](./PRD.md)** - 产品功能需求、用户故事、验收标准
- **[业务需求](./requirements/)** - 产品定位、功能模块定义
  - [概述](./requirements/01-overview.md) - 产品定位、核心价值主张
  - [产品功能模块](./requirements/02-features.md) - Canvas、任务中心、Agent 雇佣中心

### 技术文档

- **[技术架构设计](./ARCHITECTURE.md)** - 完整的技术架构文档
  - [架构原则](./architecture/01-architecture-principles.md) - 技术架构设计原则
  - [系统架构](./architecture/02-system-architecture.md) - 五层架构模型、组件详解
  - [技术实现](./architecture/03-implementation.md) - 前端/后端技术栈、Workspace 容器
  - [数据模型](./architecture/04-data-models.md) - 数据库表结构、关系图
  - [API 设计](./architecture/05-api-design.md) - RESTful API 接口规范
  - [安全与权限](./architecture/06-security.md) - 认证机制、权限模型
  - [部署与运维](./architecture/07-deployment.md) - 部署架构、环境配置

### 设计文档

- **[设计系统](./DESIGN_SYSTEM.md)** - UI/UX 设计规范、组件库、视觉风格

---

## 🎯 快速开始

### 对于产品经理/业务人员
1. 阅读 [PRD](./PRD.md) 了解产品需求
2. 查看 [业务需求](./requirements/) 了解功能定义
3. 参考 [设计系统](./DESIGN_SYSTEM.md) 了解界面设计

### 对于开发人员
1. 阅读 [技术架构设计](./ARCHITECTURE.md) 了解整体架构
2. 查看 [技术实现](./architecture/03-implementation.md) 了解技术栈
3. 参考 [API 设计](./architecture/05-api-design.md) 进行接口开发
4. 查看 [数据模型](./architecture/04-data-models.md) 了解数据库结构

### 对于设计师
1. 阅读 [设计系统](./DESIGN_SYSTEM.md) 了解设计规范
2. 查看 [产品功能模块](./requirements/02-features.md) 了解功能需求

---

## 📖 文档结构

```
docs/
├── README.md                    # 文档中心入口（本文件）
├── PRD.md                       # 产品需求文档
├── DESIGN_SYSTEM.md             # 设计系统
├── ARCHITECTURE.md              # 技术架构总览
│
├── requirements/                # 业务需求文档
│   ├── 01-overview.md          # 概述
│   └── 02-features.md          # 产品功能模块
│
└── architecture/                # 技术架构文档
    ├── 01-architecture-principles.md  # 架构原则
    ├── 02-system-architecture.md      # 系统架构
    ├── 03-implementation.md           # 技术实现
    ├── 04-data-models.md               # 数据模型
    ├── 05-api-design.md                # API 设计
    ├── 06-security.md                  # 安全与权限
    └── 07-deployment.md                # 部署与运维
```

---

## 🔄 文档更新

文档会随着项目进展持续更新。如有疑问或建议，请通过 Issue 或 Pull Request 反馈。

---

## 📝 文档维护规范

1. **业务需求文档**：由产品经理维护，描述"做什么"
2. **技术架构文档**：由技术负责人维护，描述"怎么做"
3. **设计系统文档**：由设计师维护，描述"长什么样"
4. 所有文档使用 Markdown 格式，保持结构清晰、内容准确
