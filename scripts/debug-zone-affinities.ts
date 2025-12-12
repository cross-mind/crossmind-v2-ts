import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { canvasNode } from "../lib/db/schema";
import { eq } from "drizzle-orm";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function debugZoneAffinities() {
  console.log("Debugging zone affinities...\n");

  try {
    // Get all nodes from the test project
    const projectId = "cfdd5092-ab38-4612-a1c2-4d3342ee0444";

    const nodes = await db
      .select({
        id: canvasNode.id,
        title: canvasNode.title,
        displayOrder: canvasNode.displayOrder,
        parentId: canvasNode.parentId,
        zoneAffinities: canvasNode.zoneAffinities,
      })
      .from(canvasNode)
      .where(eq(canvasNode.projectId, projectId));

    console.log(`Found ${nodes.length} nodes\n`);

    // Analyze zone affinities
    const frameworkId = "lean-canvas"; // Default framework
    const zoneDistribution: Record<string, string[]> = {};

    for (const node of nodes) {
      const affinities = node.zoneAffinities as Record<string, Record<string, number>> | null;

      if (affinities && affinities[frameworkId]) {
        // Find zone with highest affinity
        let bestZone = "unknown";
        let maxWeight = 0;

        for (const [zoneId, weight] of Object.entries(affinities[frameworkId])) {
          if (weight > maxWeight) {
            maxWeight = weight;
            bestZone = zoneId;
          }
        }

        if (!zoneDistribution[bestZone]) {
          zoneDistribution[bestZone] = [];
        }
        zoneDistribution[bestZone].push(node.title || node.id);

        console.log(`${node.title || node.id}`);
        console.log(`  Zone: ${bestZone} (weight: ${maxWeight})`);
        console.log(`  DisplayOrder: ${node.displayOrder}`);
        console.log(`  Affinities: ${JSON.stringify(affinities[frameworkId])}\n`);
      } else {
        console.log(`${node.title || node.id}`);
        console.log(`  ⚠️ NO ZONE AFFINITIES`);
        console.log(`  DisplayOrder: ${node.displayOrder}\n`);
      }
    }

    console.log("\n=== Zone Distribution ===");
    for (const [zone, nodeList] of Object.entries(zoneDistribution)) {
      console.log(`\n${zone}: ${nodeList.length} nodes`);
      nodeList.forEach((title, index) => {
        console.log(`  ${index + 1}. ${title}`);
      });
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

debugZoneAffinities();
