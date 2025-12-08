# 技术架构原则

> 📖 **相关文档**：[系统架构](./02-system-architecture.md) | [技术实现](./03-implementation.md) | [技术架构总览](../ARCHITECTURE.md)

## 1.1 架构原则

1. **分层解耦**：前端、API 网关、AI 能力、Workspace 容器、数据持久层清晰分离
2. **统一接口**：前端通过统一的 Chat 接口与后端交互，简化客户端复杂度
3. **容器化隔离**：每个项目运行在独立的 Workspace 容器中，确保安全性和可扩展性
4. **可扩展性**：支持水平扩展，Workspace 容器可按需创建和销毁

---

**下一步**：了解 [系统架构](./02-system-architecture.md) 的详细设计
