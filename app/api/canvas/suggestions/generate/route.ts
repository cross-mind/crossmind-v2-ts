import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { generateText } from "ai";
import { myProvider } from "@/lib/ai/providers";
import {
  getCanvasNodesByProjectId,
  createCanvasSuggestion,
} from "@/lib/db/queries";
import {
  buildSuggestionSystemPrompt,
  buildSuggestionUserMessage,
  validateSuggestionResponse,
} from "@/lib/ai/prompts/suggestion-prompts";
import { ChatSDKError } from "@/lib/errors";
import { framework, frameworkZone } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const dynamic = "force-dynamic";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * POST /api/canvas/suggestions/generate
 *
 * Generate AI-powered suggestions for Canvas nodes
 *
 * Request body:
 * {
 *   projectId: string,
 *   frameworkId: string,
 *   nodeId?: string  // Optional: generate for specific node only
 * }
 *
 * Response:
 * {
 *   suggestions: CanvasSuggestion[],
 *   summary: {
 *     total: number,
 *     byType: Record<string, number>,
 *     avgImpactScore: number
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:suggestions").toResponse();
    }

    // Parse request body
    const body = await request.json();
    const { projectId, frameworkId, nodeId } = body;

    if (!projectId || !frameworkId) {
      return new ChatSDKError(
        "bad_request:suggestions",
        "projectId and frameworkId are required"
      ).toResponse();
    }

    // Get framework information
    const [frameworkData] = await db
      .select()
      .from(framework)
      .where(eq(framework.id, frameworkId));

    if (!frameworkData) {
      return new ChatSDKError("not_found:suggestions", "Framework not found").toResponse();
    }

    // Get framework zones
    const zones = await db
      .select()
      .from(frameworkZone)
      .where(eq(frameworkZone.frameworkId, frameworkId));

    const frameworkContext = {
      id: frameworkData.id,
      name: frameworkData.name,
      description: frameworkData.description,
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        description: z.description || "",
      })),
    };

    // Get Canvas nodes
    const allNodes = await getCanvasNodesByProjectId({ projectId });

    // Filter nodes if nodeId specified
    const targetNodes = nodeId
      ? allNodes.filter((n) => n.id === nodeId)
      : allNodes;

    if (targetNodes.length === 0) {
      return new ChatSDKError(
        "not_found:suggestions",
        "No nodes found for suggestion generation"
      ).toResponse();
    }

    // Build prompt
    const systemPrompt = buildSuggestionSystemPrompt(frameworkContext);
    const userMessage = buildSuggestionUserMessage(
      frameworkContext,
      targetNodes.map((node) => ({
        id: node.id,
        title: node.title,
        content: node.content,
        type: node.type || "document",
        tags: node.tags || [],
        healthScore: node.healthScore ? (typeof node.healthScore === 'number' ? node.healthScore : Number(node.healthScore)) : undefined,
        healthLevel: node.healthLevel || undefined,
      }))
    );

    console.log("[Generate Suggestions] Calling AI with", {
      frameworkName: frameworkData.name,
      nodeCount: targetNodes.length,
    });

    // Call AI to generate suggestions
    const { text } = await generateText({
      model: myProvider.languageModel("chat-model"),
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.7,
    });

    console.log("[Generate Suggestions] AI response length:", text.length);

    // Parse AI response (strip markdown code blocks if present)
    let suggestionsData;
    try {
      // Remove markdown code blocks if present (```json ... ```)
      let cleanedText = text.trim();
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```(?:json)?\s*\n/, "").replace(/\n```\s*$/, "");
      }
      suggestionsData = JSON.parse(cleanedText);
      console.log("[Generate Suggestions] Parsed suggestions:", JSON.stringify(suggestionsData, null, 2));
    } catch (parseError) {
      console.error("[Generate Suggestions] JSON parse error:", parseError);
      console.error("[Generate Suggestions] Raw text:", text);
      return new ChatSDKError(
        "bad_request:suggestions",
        "Failed to parse AI response as JSON"
      ).toResponse();
    }

    // Validate response structure
    if (!validateSuggestionResponse(suggestionsData)) {
      console.error(
        "[Generate Suggestions] Invalid response structure:",
        suggestionsData
      );
      return new ChatSDKError(
        "bad_request:suggestions",
        "AI response does not match expected format"
      ).toResponse();
    }

    // Save suggestions to database
    const createdSuggestions = [];
    for (const data of suggestionsData) {
      try {
        // Convert "global" nodeId to null for canvas-wide suggestions
        const nodeId = data.nodeId === "global" ? null : data.nodeId;

        const suggestion = await createCanvasSuggestion({
          projectId,
          frameworkId,
          nodeId,
          type: data.type,
          title: data.title,
          description: data.description,
          reason: data.reason,
          priority: data.priority,
          impactScore: data.impactScore || null,
          actionParams: data.actionParams,
          source: "ai-health-check",
        });
        createdSuggestions.push(suggestion);
      } catch (error) {
        console.error("[Generate Suggestions] Failed to save suggestion:", {
          error,
          suggestionData: data,
        });
        // Continue with other suggestions even if one fails
      }
    }

    // Calculate summary
    const byType: Record<string, number> = {};
    let totalImpactScore = 0;
    let countWithScore = 0;

    for (const s of createdSuggestions) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      if (s.impactScore) {
        totalImpactScore += s.impactScore;
        countWithScore++;
      }
    }

    const avgImpactScore =
      countWithScore > 0 ? Math.round(totalImpactScore / countWithScore) : 0;

    console.log("[Generate Suggestions] Created suggestions:", {
      total: createdSuggestions.length,
      byType,
      avgImpactScore,
    });

    return NextResponse.json({
      suggestions: createdSuggestions,
      summary: {
        total: createdSuggestions.length,
        byType,
        avgImpactScore,
      },
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("[Generate Suggestions API] Error:", error);
    return new ChatSDKError(
      "bad_request:database",
      "Failed to generate suggestions"
    ).toResponse();
  }
}
