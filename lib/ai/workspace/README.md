# Workspace Container Integration

This directory contains the integration layer for CrossMind's Workspace Container architecture.

## Architecture Overview

According to the CrossMind architecture documentation (`/Users/ivan/Workspace/crossmind/docs/architecture/02-system-architecture.md`), the system uses a Workspace Container pattern where:

1. **AI SDK** runs on Vercel edge/serverless (this repo)
2. **Workspace Containers** run isolated Agent SDK + Claude Code CLI environments
3. **Custom LanguageModelV1 Provider** bridges the two layers

## Implementation Status

### ✅ Completed
- Database schema for projects and workspace_container_id tracking
- API routes for project management
- Placeholder workspace model provider

### 🚧 Todo (Requires Infrastructure)
- Docker container setup for workspace environments
- Workspace Manager implementation (create/destroy containers)
- Agent Server HTTP interface
- RAG service integration
- System prompt builder with project context

## Next Steps

To fully implement this architecture, you'll need to:

1. **Set up container infrastructure** (Docker/K8s)
2. **Create Agent Server** (Node.js + Express + Claude Agent SDK)
3. **Implement RAG service** using pgvector
4. **Build Workspace Manager** to handle container lifecycle
5. **Integrate with Vercel AI SDK** through the custom provider

## References

- Architecture docs: `/Users/ivan/Workspace/crossmind/docs/architecture/`
- Original implementation: `/Users/ivan/Workspace/crossmind/`
- chat-sdk docs: https://chat-sdk.dev/
