"use server";

import {
  getCanvasNodeById,
  updateCanvasNode,
  createCanvasNode,
  createCanvasActivity,
} from "./queries";
import type { CanvasSuggestion } from "./schema";
import { ChatSDKError } from "../errors";

/**
 * Suggestion Action Executors
 *
 * Each function executes a specific type of Canvas suggestion
 * and returns a standardized result object.
 */

interface SuggestionResult {
  success: boolean;
  type: string;
  affectedNodeId?: string;
  changes?: any;
  error?: string;
}

/**
 * Execute add-tag suggestion
 * Adds missing tags to the target node
 */
export async function executeAddTag(
  suggestion: CanvasSuggestion,
  userId: string,
): Promise<SuggestionResult> {
  try {
    if (!suggestion.nodeId) {
      throw new Error("Node ID is required for add-tag suggestion");
    }

    const node = await getCanvasNodeById({ id: suggestion.nodeId });
    if (!node) {
      throw new Error("Target node not found");
    }

    const tagsToAdd = suggestion.actionParams?.tags || [];
    if (tagsToAdd.length === 0) {
      throw new Error("No tags specified in suggestion");
    }

    // Merge existing tags with new tags (avoid duplicates)
    const existingTags = node.tags || [];
    const updatedTags = Array.from(new Set([...existingTags, ...tagsToAdd]));

    // Update node with new tags
    await updateCanvasNode({
      id: suggestion.nodeId,
      tags: updatedTags,
    });

    // Create activity record
    await createCanvasActivity({
      nodeId: suggestion.nodeId,
      projectId: suggestion.projectId,
      userId,
      type: "tag_added",
      description: `Added tags: ${tagsToAdd.join(", ")}`,
      details: `Applied suggestion: ${suggestion.title}`,
    });

    return {
      success: true,
      type: "add-tag",
      affectedNodeId: suggestion.nodeId,
      changes: {
        addedTags: tagsToAdd,
        allTags: updatedTags,
      },
    };
  } catch (error) {
    return {
      success: false,
      type: "add-tag",
      error: error instanceof Error ? error.message : "Failed to add tags",
    };
  }
}

/**
 * Execute add-node suggestion
 * Creates a new related node based on suggestion parameters
 * Supports zone placement when targetZone is specified
 */
export async function executeAddNode(
  suggestion: CanvasSuggestion,
  userId: string,
): Promise<SuggestionResult> {
  try {
    const newNodeData = suggestion.actionParams?.newNode;
    if (!newNodeData) {
      throw new Error("New node data is required for add-node suggestion");
    }

    // Build zoneAffinities if targetZone is specified
    const zoneAffinities: Record<string, Record<string, number>> = {};
    console.log("[executeAddNode] Debug:", {
      targetZone: newNodeData.targetZone,
      frameworkId: suggestion.frameworkId,
      hasTargetZone: !!newNodeData.targetZone,
      hasFrameworkId: !!suggestion.frameworkId,
    });

    if (newNodeData.targetZone && suggestion.frameworkId) {
      // Set high affinity (0.9) for the target zone
      zoneAffinities[suggestion.frameworkId] = {
        [newNodeData.targetZone]: 0.9,
      };
      console.log("[executeAddNode] Built zoneAffinities:", zoneAffinities);
    } else {
      console.log("[executeAddNode] Skipping zoneAffinities - missing targetZone or frameworkId");
    }

    // Create new node
    const newNode = await createCanvasNode({
      projectId: suggestion.projectId,
      title: newNodeData.title,
      content: newNodeData.content || "",
      type: (newNodeData.type as any) || "document",
      tags: newNodeData.tags || [],
      parentId: suggestion.nodeId || undefined, // Link to source node if available
      createdById: userId,
      zoneAffinities: Object.keys(zoneAffinities).length > 0 ? zoneAffinities : undefined,
    });

    // Create activity on source node if it exists
    if (suggestion.nodeId) {
      await createCanvasActivity({
        nodeId: suggestion.nodeId,
        projectId: suggestion.projectId,
        userId,
        type: "updated",
        description: `Created related node: ${newNodeData.title}`,
        details: `Applied suggestion: ${suggestion.title}`,
      });
    }

    return {
      success: true,
      type: "add-node",
      affectedNodeId: newNode.id,
      changes: {
        newNodeId: newNode.id,
        newNodeTitle: newNode.title,
        linkedToNode: suggestion.nodeId,
        targetZone: newNodeData.targetZone,
        zoneAffinities,
      },
    };
  } catch (error) {
    return {
      success: false,
      type: "add-node",
      error: error instanceof Error ? error.message : "Failed to create node",
    };
  }
}

/**
 * Execute refine-content suggestion
 * Directly replaces node content with AI-refined version
 */
export async function executeRefineContent(
  suggestion: CanvasSuggestion,
  userId: string,
): Promise<SuggestionResult> {
  try {
    if (!suggestion.nodeId) {
      throw new Error("Node ID is required for refine-content suggestion");
    }

    const refinedContent = suggestion.actionParams?.refinedContent;
    if (!refinedContent) {
      throw new Error("Refined content is required");
    }

    const node = await getCanvasNodeById({ id: suggestion.nodeId });
    if (!node) {
      throw new Error("Target node not found");
    }

    const originalContent = node.content;

    // Update node content
    await updateCanvasNode({
      id: suggestion.nodeId,
      content: refinedContent,
    });

    // Create activity record
    await createCanvasActivity({
      nodeId: suggestion.nodeId,
      projectId: suggestion.projectId,
      userId,
      type: "updated",
      description: "Refined content using AI suggestion",
      details: `Applied suggestion: ${suggestion.title}`,
    });

    return {
      success: true,
      type: "refine-content",
      affectedNodeId: suggestion.nodeId,
      changes: {
        originalContent,
        refinedContent,
      },
    };
  } catch (error) {
    return {
      success: false,
      type: "refine-content",
      error: error instanceof Error ? error.message : "Failed to refine content",
    };
  }
}

/**
 * Execute content-suggestion (conversational optimization)
 * Returns prompt template for AI Chat - does NOT modify node directly
 */
export async function executeContentSuggestion(
  suggestion: CanvasSuggestion,
  userId: string,
): Promise<SuggestionResult> {
  try {
    if (!suggestion.nodeId) {
      throw new Error("Node ID is required for content-suggestion");
    }

    const node = await getCanvasNodeById({ id: suggestion.nodeId });
    if (!node) {
      throw new Error("Target node not found");
    }

    const suggestionPoints = suggestion.actionParams?.suggestionPoints;
    if (!suggestionPoints || suggestionPoints.length === 0) {
      throw new Error("Suggestion points are required");
    }

    // Build numbered list of suggestion points
    const points = suggestionPoints
      .map((point: string, i: number) => `${i + 1}. ${point}`)
      .join("\n");

    // Use custom template or default template
    const defaultTemplate = `请帮我优化「${node.title}」这个节点的内容，重点关注以下几个方面：

{points}

当前内容：
\`\`\`
{content}
\`\`\`

请保持原有的结构和风格，主要是补充缺失的信息和优化表达。`;

    const promptTemplate =
      suggestion.actionParams?.promptTemplate || defaultTemplate;

    // Replace placeholders
    const prompt = promptTemplate
      .replace("{title}", node.title)
      .replace("{points}", points)
      .replace("{content}", node.content);

    return {
      success: true,
      type: "content-suggestion",
      affectedNodeId: suggestion.nodeId,
      changes: {
        action: "open-ai-chat",
        nodeId: suggestion.nodeId,
        prefilledPrompt: prompt,
      },
    };
  } catch (error) {
    return {
      success: false,
      type: "content-suggestion",
      error:
        error instanceof Error
          ? error.message
          : "Failed to prepare content suggestion",
    };
  }
}

/**
 * Main executor function - routes to appropriate handler based on type
 */
export async function executeSuggestion(
  suggestion: CanvasSuggestion,
  userId: string,
): Promise<SuggestionResult> {
  switch (suggestion.type) {
    case "add-tag":
      return executeAddTag(suggestion, userId);

    case "add-node":
      return executeAddNode(suggestion, userId);

    case "refine-content":
      return executeRefineContent(suggestion, userId);

    case "content-suggestion":
      return executeContentSuggestion(suggestion, userId);

    case "health-issue":
      // Health issues are informational only, no action needed
      return {
        success: false,
        type: "health-issue",
        error: "Health issues cannot be executed directly",
      };

    default:
      return {
        success: false,
        type: suggestion.type,
        error: `Unknown suggestion type: ${suggestion.type}`,
      };
  }
}
