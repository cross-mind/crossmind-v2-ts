import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { db } from "@/lib/db";
import { canvasNode } from "@/lib/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * POST /api/canvas/populate-affinities
 *
 * Populates default zone affinities for nodes that have null or empty affinities
 * for the current project framework.
 *
 * Strategy:
 * - Distributes nodes evenly across zones using round-robin
 * - Assigns weight 0.8 to primary zone, 0.2 to adjacent zones for natural clustering
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const { projectId, projectFrameworkId } = await request.json();

    if (!projectId || !projectFrameworkId) {
      return new ChatSDKError("bad_request:api", "Missing projectId or projectFrameworkId").toResponse();
    }

    // Get all root nodes for this project (exclude child nodes)
    const nodes = await db
      .select({
        id: canvasNode.id,
        title: canvasNode.title,
        zoneAffinities: canvasNode.zoneAffinities,
        tags: canvasNode.tags,
        displayOrder: canvasNode.displayOrder,
      })
      .from(canvasNode)
      .where(
        and(
          eq(canvasNode.projectId, projectId),
          isNull(canvasNode.parentId)
        )
      )
      .orderBy(canvasNode.displayOrder);

    // Get project framework with zones
    const frameworkResult = await fetch(
      `http://localhost:8000/api/projects/${projectId}/framework`,
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!frameworkResult.ok) {
      throw new Error("Failed to fetch framework");
    }

    const { framework } = await frameworkResult.json();

    if (framework.id !== projectFrameworkId) {
      return new ChatSDKError("bad_request:api", "Framework ID mismatch").toResponse();
    }

    const zones = framework.zones;
    if (!zones || zones.length === 0) {
      return new ChatSDKError("bad_request:api", "Framework has no zones").toResponse();
    }

    // Filter nodes that need affinities (null or missing current framework)
    const nodesToUpdate = nodes.filter((node) => {
      if (!node.zoneAffinities) return true;
      const affinities = node.zoneAffinities as Record<string, Record<string, number>>;
      return !affinities[projectFrameworkId] || Object.keys(affinities[projectFrameworkId]).length === 0;
    });

    console.log(`[Populate Affinities] Found ${nodesToUpdate.length} nodes to update`);

    // Distribute nodes across zones using round-robin
    const updates = [];
    for (let i = 0; i < nodesToUpdate.length; i++) {
      const node = nodesToUpdate[i];
      const primaryZoneIndex = i % zones.length;
      const primaryZone = zones[primaryZoneIndex];

      // Build affinities: primary zone gets 0.8, adjacent zones get 0.2
      const newAffinities: Record<string, number> = {
        [primaryZone.zoneKey]: 0.8,
      };

      // Add adjacent zones for natural clustering
      const prevZoneIndex = (primaryZoneIndex - 1 + zones.length) % zones.length;
      const nextZoneIndex = (primaryZoneIndex + 1) % zones.length;
      newAffinities[zones[prevZoneIndex].zoneKey] = 0.2;
      newAffinities[zones[nextZoneIndex].zoneKey] = 0.2;

      // Merge with existing affinities
      const existingAffinities = (node.zoneAffinities as Record<string, Record<string, number>>) || {};
      const updatedZoneAffinities = {
        ...existingAffinities,
        [projectFrameworkId]: newAffinities,
      };

      updates.push({
        nodeId: node.id,
        zoneAffinities: updatedZoneAffinities,
      });

      console.log(`[Populate Affinities] Node "${node.title}" → Zone "${primaryZone.name}"`);
    }

    // Batch update all nodes
    for (const update of updates) {
      await db
        .update(canvasNode)
        .set({ zoneAffinities: update.zoneAffinities })
        .where(eq(canvasNode.id, update.nodeId));
    }

    console.log(`[Populate Affinities] Successfully updated ${updates.length} nodes`);

    return NextResponse.json({
      success: true,
      updatedCount: updates.length,
      message: `Populated affinities for ${updates.length} nodes`,
    });
  } catch (error) {
    console.error("[Populate Affinities] Error:", error);
    return new ChatSDKError("bad_request:api", "Failed to populate affinities").toResponse();
  }
}
