/**
 * AI Prompt Templates for Canvas Suggestion Generation
 *
 * These prompts guide the AI to analyze Canvas nodes and generate
 * actionable suggestions based on the current framework context.
 */

import type { Framework } from "@/lib/db/schema";

interface FrameworkContext {
  id: string;
  name: string;
  description: string;
  zones: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

interface NodeContext {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  zone?: string;
  healthScore?: number;
  healthLevel?: string;
}

/**
 * System prompt for Canvas suggestion generation
 */
export function buildSuggestionSystemPrompt(framework: FrameworkContext): string {
  return `你是一个产品设计专家，负责分析 Canvas 节点并提供改进建议。

当前框架: ${framework.name}
框架说明: ${framework.description}

区域定义:
${framework.zones.map((z) => `- ${z.name} (${z.id}): ${z.description}`).join("\n")}

## 你的任务

分析提供的节点内容，为每个节点生成 1-3 条具体的改进建议。

## 建议类型

1. **add-tag**: 建议添加缺失的重要标签
   - 用于: 节点缺少关键分类标签
   - 示例: 添加 "type/vision" 或 "priority/high"

2. **add-node**: 建议创建新的相关节点
   - 用于: 缺少某个重要的关联节点或某个区域缺少节点
   - 示例: 有"问题"节点但缺少"解决方案"节点
   - 支持指定目标区域: 通过 targetZone 参数指定新节点应该放在哪个区域

3. **content-suggestion**: 提供内容优化要点（对话式）
   - 用于: 内容需要补充或优化，但需要用户参与讨论
   - 提供 3-5 条优化要点，不提供完整内容
   - 示例: "补充具体的团队规模和预算范围"

4. **refine-content**: 提供优化后的完整内容（直接替换）
   - 用于: 内容简短且可以直接优化
   - 提供完整的优化后内容
   - 仅用于 100 字以内的简短内容

## 输出格式

请以 JSON 数组格式返回建议，每条建议包含：

\`\`\`json
[
  {
    "nodeId": "节点 ID (针对特定节点) 或 \"global\" (整体画布建议)",
    "type": "建议类型（add-tag | add-node | content-suggestion | refine-content）",
    "title": "简短标题（10字内）",
    "description": "详细描述（50字内）",
    "reason": "为什么需要这个改进（30字内）",
    "priority": "优先级（low | medium | high | critical）",
    "impactScore": "预估改进分数（0-100）",
    "actionParams": {
      // 根据 type 不同，包含不同的参数
      // add-tag: { "tags": ["tag1", "tag2"] }
      // add-node: { "newNode": { "title": "...", "content": "...", "type": "...", "tags": [...], "targetZone": "zone_id (可选)" } }
      // content-suggestion: { "suggestionPoints": ["要点1", "要点2", ...], "promptTemplate": "可选的提示词模板" }
      // refine-content: { "refinedContent": "优化后的完整内容" }
    }
  }
]
\`\`\`

## 生成原则

1. **具体性**: 建议要具体、可执行，避免空泛的建议
2. **相关性**: 建议必须与当前框架和节点内容直接相关
3. **优先级**: 优先解决影响健康度的核心问题
4. **平衡性**: 不要为每个节点都生成大量建议，聚焦关键问题
5. **类型选择**:
   - 内容 > 200 字 → 使用 content-suggestion（对话式）
   - 内容 < 100 字 → 可使用 refine-content（直接替换）
   - 缺少标签 → 使用 add-tag
   - 缺少关联节点 → 使用 add-node
6. **区域建议** (add-node):
   - 分析框架的区域定义，识别缺失的节点
   - 当某个区域完全没有节点时，建议在该区域创建节点
   - 设置 targetZone 为目标区域的 ID
   - 节点标题和内容应与目标区域的定义一致
   - **使用 nodeId: "global"** 表示这是整体画布的建议，而非针对特定节点

请确保返回的是**有效的 JSON 数组**，不要包含其他文本。`;
}

/**
 * User message for Canvas suggestion generation
 */
export function buildSuggestionUserMessage(
  framework: FrameworkContext,
  nodes: NodeContext[]
): string {
  return JSON.stringify(
    {
      framework: {
        id: framework.id,
        name: framework.name,
        zones: framework.zones,
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        title: node.title,
        content: node.content,
        type: node.type,
        tags: node.tags,
        zone: node.zone,
        healthScore: node.healthScore,
        healthLevel: node.healthLevel,
      })),
    },
    null,
    2
  );
}

/**
 * Validate AI response structure
 */
export function validateSuggestionResponse(data: any): boolean {
  if (!Array.isArray(data)) {
    return false;
  }

  for (const item of data) {
    // Check required fields
    if (
      !item.nodeId ||
      !item.type ||
      !item.title ||
      !item.description ||
      !item.priority
    ) {
      return false;
    }

    // Validate type
    const validTypes = [
      "add-tag",
      "add-node",
      "content-suggestion",
      "refine-content",
      "health-issue",
    ];
    if (!validTypes.includes(item.type)) {
      return false;
    }

    // Validate priority
    const validPriorities = ["low", "medium", "high", "critical"];
    if (!validPriorities.includes(item.priority)) {
      return false;
    }

    // Validate actionParams based on type
    if (!item.actionParams) {
      return false;
    }

    switch (item.type) {
      case "add-tag":
        if (!Array.isArray(item.actionParams.tags)) {
          return false;
        }
        break;

      case "add-node":
        if (
          !item.actionParams.newNode ||
          !item.actionParams.newNode.title ||
          !item.actionParams.newNode.content
        ) {
          return false;
        }
        break;

      case "content-suggestion":
        if (!Array.isArray(item.actionParams.suggestionPoints)) {
          return false;
        }
        break;

      case "refine-content":
        if (
          !item.actionParams.refinedContent ||
          typeof item.actionParams.refinedContent !== "string"
        ) {
          return false;
        }
        break;
    }
  }

  return true;
}
