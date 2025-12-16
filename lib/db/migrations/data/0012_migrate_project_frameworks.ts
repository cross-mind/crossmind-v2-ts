/**
 * Data Migration: Create project-level framework snapshots
 *
 * This script migrates existing projects to use project-level framework snapshots:
 * 1. For each project, create ProjectFramework snapshot from default framework
 * 2. Copy zones from platform framework to project framework
 * 3. Update CanvasNode.projectFrameworkId (based on node's frameworkId position data)
 * 4. Rewrite CanvasNode.zoneAffinities JSONB keys (frameworkId → projectFrameworkId)
 * 5. Update CanvasSuggestion.projectFrameworkId
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNotNull } from "drizzle-orm";
import postgres from "postgres";
import {
  project,
  framework,
  frameworkZone,
  projectFramework,
  projectFrameworkZone,
  canvasNode,
  canvasSuggestion,
  type Project,
  type Framework,
  type FrameworkZone,
} from "@/lib/db/schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

interface MigrationStats {
  projectsProcessed: number;
  frameworksCreated: number;
  zonesCreated: number;
  nodesUpdated: number;
  suggestionsUpdated: number;
  errors: Array<{ projectId: string; error: string }>;
}

export async function migrateProjectFrameworks(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    projectsProcessed: 0,
    frameworksCreated: 0,
    zonesCreated: 0,
    nodesUpdated: 0,
    suggestionsUpdated: 0,
    errors: [],
  };

  console.log("[Migration] Starting project framework snapshot migration...");

  try {
    // Get all projects with default framework
    const projects = await db
      .select()
      .from(project)
      .where(isNotNull(project.defaultFrameworkId));

    console.log(`[Migration] Found ${projects.length} projects with default frameworks`);

    // Process each project
    for (const proj of projects) {
      try {
        await migrateProject(proj, stats);
        stats.projectsProcessed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Migration] Error processing project ${proj.id}:`, errorMsg);
        stats.errors.push({ projectId: proj.id, error: errorMsg });
      }
    }

    // Log final stats
    console.log("[Migration] Migration completed:");
    console.log(`  - Projects processed: ${stats.projectsProcessed}/${projects.length}`);
    console.log(`  - Frameworks created: ${stats.frameworksCreated}`);
    console.log(`  - Zones created: ${stats.zonesCreated}`);
    console.log(`  - Nodes updated: ${stats.nodesUpdated}`);
    console.log(`  - Suggestions updated: ${stats.suggestionsUpdated}`);

    if (stats.errors.length > 0) {
      console.error(`  - Errors: ${stats.errors.length}`);
      stats.errors.forEach(({ projectId, error }) => {
        console.error(`    Project ${projectId}: ${error}`);
      });
    }

    return stats;
  } catch (error) {
    console.error("[Migration] Fatal error:", error);
    throw error;
  } finally {
    await client.end();
  }
}

async function migrateProject(proj: Project, stats: MigrationStats): Promise<void> {
  if (!proj.defaultFrameworkId) {
    return; // Skip projects without default framework
  }

  console.log(`[Migration] Processing project: ${proj.name} (${proj.id})`);

  // 1. Get source framework
  const [sourceFramework] = await db
    .select()
    .from(framework)
    .where(eq(framework.id, proj.defaultFrameworkId))
    .limit(1);

  if (!sourceFramework) {
    throw new Error(`Framework ${proj.defaultFrameworkId} not found`);
  }

  // 2. Check if project framework already exists
  const [existing] = await db
    .select()
    .from(projectFramework)
    .where(
      and(
        eq(projectFramework.projectId, proj.id),
        eq(projectFramework.sourceFrameworkId, proj.defaultFrameworkId)
      )
    )
    .limit(1);

  let projectFrameworkId: string;

  const now = new Date();

  if (existing) {
    console.log(`  - Project framework already exists, skipping creation`);
    projectFrameworkId = existing.id;
  } else {
    // 3. Create project framework snapshot
    const [newProjectFramework] = await db
      .insert(projectFramework)
      .values({
        projectId: proj.id,
        sourceFrameworkId: proj.defaultFrameworkId,
        name: sourceFramework.name,
        icon: sourceFramework.icon,
        description: sourceFramework.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    projectFrameworkId = newProjectFramework.id;
    stats.frameworksCreated++;
    console.log(`  - Created project framework: ${projectFrameworkId}`);
  }

  // 4. Copy zones from source framework (always run, even if framework exists)
  const existingZones = await db
    .select()
    .from(projectFrameworkZone)
    .where(eq(projectFrameworkZone.projectFrameworkId, projectFrameworkId));

  if (existingZones.length === 0) {
    const zones = await db
      .select()
      .from(frameworkZone)
      .where(eq(frameworkZone.frameworkId, proj.defaultFrameworkId));

    if (zones.length > 0) {
      await db.insert(projectFrameworkZone).values(
        zones.map((zone) => ({
          projectFrameworkId,
          sourceZoneId: zone.id,
          zoneKey: zone.zoneKey,
          name: zone.name,
          description: zone.description,
          colorKey: zone.colorKey,
          displayOrder: zone.displayOrder,
          createdAt: now,
        }))
      );

      stats.zonesCreated += zones.length;
      console.log(`  - Copied ${zones.length} zones`);
    }
  } else {
    console.log(`  - ${existingZones.length} zones already exist, skipping`);
  }

  // 5. Update CanvasNode.projectFrameworkId
  // Strategy: If node has positions data for the framework, assign it
  const nodes = await db
    .select()
    .from(canvasNode)
    .where(eq(canvasNode.projectId, proj.id));

  let nodesUpdatedCount = 0;
  for (const node of nodes) {
    const positions = node.positions as Record<string, any> | null;

    // Check if node has position data for this framework
    const hasFrameworkPosition = positions && proj.defaultFrameworkId && positions[proj.defaultFrameworkId];

    if (hasFrameworkPosition) {
      // Update node's projectFrameworkId
      await db
        .update(canvasNode)
        .set({ projectFrameworkId })
        .where(eq(canvasNode.id, node.id));

      // Rewrite zoneAffinities keys: frameworkId → projectFrameworkId
      const zoneAffinities = node.zoneAffinities as Record<string, Record<string, number>> | null;
      if (zoneAffinities && proj.defaultFrameworkId && zoneAffinities[proj.defaultFrameworkId]) {
        const newZoneAffinities = {
          ...zoneAffinities,
          [projectFrameworkId]: zoneAffinities[proj.defaultFrameworkId],
        };
        delete newZoneAffinities[proj.defaultFrameworkId];

        await db
          .update(canvasNode)
          .set({ zoneAffinities: newZoneAffinities })
          .where(eq(canvasNode.id, node.id));
      }

      nodesUpdatedCount++;
    }
  }

  stats.nodesUpdated += nodesUpdatedCount;
  console.log(`  - Updated ${nodesUpdatedCount} nodes`);

  // 6. Update CanvasSuggestion.projectFrameworkId
  // Note: projectFrameworkId was renamed from frameworkId, so existing values should already reference platform frameworks
  // We need to update suggestions that were created for this project
  const updatedSuggestions = await db
    .update(canvasSuggestion)
    .set({ projectFrameworkId })
    .where(
      and(
        eq(canvasSuggestion.projectId, proj.id),
        isNotNull(canvasSuggestion.projectFrameworkId) // Only update if previously had frameworkId
      )
    )
    .returning({ id: canvasSuggestion.id });

  stats.suggestionsUpdated += updatedSuggestions.length;
  console.log(`  - Updated ${updatedSuggestions.length} suggestions`);
}

// Export for use as module
export default migrateProjectFrameworks;
