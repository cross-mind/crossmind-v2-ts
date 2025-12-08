# 部署与运维

> 📖 **相关文档**：[安全与权限](./06-security.md) | [系统架构](./02-system-architecture.md) | [技术架构总览](../ARCHITECTURE.md)

## 8.1 部署架构

### 8.1.1 前端与 API

- **平台**：Vercel
- **优势**：
  - 全球 CDN
  - Serverless Functions（API 路由）
  - 自动 HTTPS
  - 预览部署

### 8.1.2 Workspace 容器

**开发环境**：
- Docker + Docker Compose
- 本地运行，端口映射

**生产环境**：
- **方案 A**：Kubernetes
  - 每个项目一个 Pod
  - 自动扩缩容
  - 资源配额限制
- **方案 B**：专用服务器 + Docker
  - 成本更低
  - 需要手动管理

**推荐**：Kubernetes（生产环境）

### 8.1.3 数据库

- **Postgres**：Neon（Serverless Postgres）
- **Blob 存储**：Vercel Blob 或 S3
- **Redis**（可选）：Upstash（Serverless Redis）

## 8.2 环境变量

```bash
# 认证
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# 数据库
DATABASE_URL=
POSTGRES_URL=

# AI
ANTHROPIC_API_KEY=

# Workspace
WORKSPACE_MANAGER_URL=
WORKSPACE_API_KEY=

# 第三方集成
GITHUB_APP_ID=
GITHUB_APP_SECRET=
STRIPE_API_KEY=
VERCEL_API_TOKEN=
```

## 8.3 监控与日志

- **错误追踪**：Sentry
- **性能监控**：Vercel Analytics
- **日志**：Vercel Logs + 容器日志（Fluentd → Elasticsearch）

## 8.4 备份与恢复

- **数据库备份**：Neon 自动备份（每日）
- **文件备份**：Vercel Blob/S3 版本控制
- **容器快照**：定期备份 `/workspace` 目录
