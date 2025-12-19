"use server";

import {
  getCanvasNodeById,
  updateCanvasNode,
  createCanvasNode,
  createCanvasActivity,
  getProjectFrameworkWithZones,
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
    // Support three formats for backwards compatibility:
    // 1. Correct format: { newNode: { title, content, targetZone } }
    // 2. AI-generated format: { zoneName, suggestedContent }
    // 3. Null actionParams format: parse zone from description
    let newNodeData = suggestion.actionParams?.newNode;

    if (!newNodeData) {
      // Try to parse AI-generated format
      const { zoneName, suggestedContent } = suggestion.actionParams || {};
      if (zoneName && suggestedContent) {
        console.log("[executeAddNode] Converting AI format to standard format");

        // Convert zone name to zoneKey by querying framework zones
        let targetZoneKey: string | undefined;
        if (suggestion.projectFrameworkId) {
          const framework = await getProjectFrameworkWithZones({
            projectFrameworkId: suggestion.projectFrameworkId,
          });
          if (framework?.zones) {
            const matchedZone = framework.zones.find(z => z.name === zoneName);
            if (matchedZone) {
              targetZoneKey = matchedZone.zoneKey;
              console.log(`[executeAddNode] Resolved zone "${zoneName}" to zoneKey: ${targetZoneKey}`);
            } else {
              console.warn(`[executeAddNode] Zone "${zoneName}" not found in framework`);
            }
          }
        }

        newNodeData = {
          title: suggestion.title || `${zoneName}相关节点`,
          content: suggestedContent,
          type: "document",
          targetZone: targetZoneKey || zoneName, // Use resolved zoneKey or fallback to name
          tags: [],
        };
      } else if (!suggestion.actionParams || suggestion.actionParams === null) {
        // Format 3: No actionParams at all - parse from description
        console.log("[executeAddNode] No actionParams provided, parsing from description");

        // Extract zone name from description (format: 在"区域名"区域...)
        const zoneMatch = suggestion.description.match(/在["""]([^"""]+)["""]区域/);
        const extractedZoneName = zoneMatch ? zoneMatch[1] : null;

        if (!extractedZoneName) {
          throw new Error("Cannot extract target zone from description. Description should contain: 在\"区域名\"区域...");
        }

        console.log(`[executeAddNode] Extracted zone name from description: "${extractedZoneName}"`);

        // Convert zone name to zoneKey by querying framework zones
        let targetZoneKey: string | undefined;
        if (suggestion.projectFrameworkId) {
          const framework = await getProjectFrameworkWithZones({
            projectFrameworkId: suggestion.projectFrameworkId,
          });
          if (framework?.zones) {
            const matchedZone = framework.zones.find(z => z.name === extractedZoneName);
            if (matchedZone) {
              targetZoneKey = matchedZone.zoneKey;
              console.log(`[executeAddNode] Resolved zone "${extractedZoneName}" to zoneKey: ${targetZoneKey}`);
            } else {
              console.warn(`[executeAddNode] Zone "${extractedZoneName}" not found in framework zones:`, framework.zones.map(z => z.name));
            }
          }
        }

        newNodeData = {
          title: suggestion.title,
          content: suggestion.description,
          type: "document",
          targetZone: targetZoneKey || extractedZoneName,
          tags: [],
        };
      } else {
        throw new Error("New node data is required for add-node suggestion");
      }
    }

    // Build zoneAffinities if targetZone is specified
    const zoneAffinities: Record<string, Record<string, number>> = {};
    console.log("[executeAddNode] Debug:", {
      targetZone: newNodeData.targetZone,
      projectFrameworkId: suggestion.projectFrameworkId,
      hasTargetZone: !!newNodeData.targetZone,
      hasProjectFrameworkId: !!suggestion.projectFrameworkId,
    });

    if (newNodeData.targetZone && suggestion.projectFrameworkId) {
      // IMPORTANT: Use zoneKey (like "solution", "problem") not zone ID
      // Frontend expects zoneAffinities to use zoneKey as the key
      zoneAffinities[suggestion.projectFrameworkId] = {
        [newNodeData.targetZone]: 0.9,
      };
      console.log("[executeAddNode] Built zoneAffinities:", zoneAffinities);
    } else {
      console.log("[executeAddNode] Skipping zoneAffinities - missing targetZone or projectFrameworkId");
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
      // Health issues open AI chat for discussion
      return {
        success: true,
        type: "health-issue",
        changes: {
          action: "open-ai-chat",
          nodeId: suggestion.nodeId,
          prefilledPrompt: `${suggestion.title}\n\n${suggestion.description}\n\n请帮我分析这个问题并给出具体的改进建议。`,
        },
      };

    default:
      return {
        success: false,
        type: suggestion.type,
        error: `Unknown suggestion type: ${suggestion.type}`,
      };
  }
}
