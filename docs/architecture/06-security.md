# 安全与权限

> 📖 **相关文档**：[API 设计](./05-api-design.md) | [部署与运维](./07-deployment.md) | [技术架构总览](../ARCHITECTURE.md)

## 7.1 认证机制

- **NextAuth v5**：OAuth 2.0 认证
- **Session 管理**：JWT Token，存储在 HTTP-only Cookie
- **Token 刷新**：自动刷新过期 Token

## 7.2 权限模型

### 7.2.1 项目级权限

- **Owner**：
  - 全部权限（创建/删除项目、管理成员、删除数据）
- **Member**：
  - 创建/编辑任务、Canvas 节点
  - 触发 Agent 任务（受限）
  - 查看项目数据
- **Guest**：
  - 只读权限

### 7.2.2 Agent 权限

- Agent 身份只能访问：
  - 关联的 `agent_order` 范围内的数据
  - 授予的第三方工具权限（GitHub/Stripe/Vercel）
- 不能：
  - 访问其他项目
  - 执行危险命令（在容器级别限制）

## 7.3 数据隔离

- **数据库级别**：所有查询都包含 `project_id` 过滤
- **Workspace 容器级别**：每个项目独立的文件系统和进程空间
- **API 级别**：中间件验证用户对项目的访问权限

## 7.4 安全措施

- **输入验证**：所有用户输入都经过 Schema 验证（Zod）
- **SQL 注入防护**：使用 Drizzle ORM 的参数化查询
- **XSS 防护**：React 自动转义，Markdown 渲染使用安全的库
- **CSRF 防护**：NextAuth 内置 CSRF Token
- **Rate Limiting**：API 路由限流（Vercel Edge Config 或 Upstash）
