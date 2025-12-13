import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { canvasNode } from "../lib/db/schema.js";
import { eq } from "drizzle-orm";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function testZoneMove() {
  const nodeId = "212dea98-77e0-4542-a566-3c7a0f4bcca3";

  const node = await db
    .select({
      id: canvasNode.id,
      title: canvasNode.title,
      zoneAffinities: canvasNode.zoneAffinities,
    })
    .from(canvasNode)
    .where(eq(canvasNode.id, nodeId))
    .limit(1);

  if (node.length === 0) {
    console.log("Node not found");
    return;
  }

  console.log("Node after move:");
  console.log(JSON.stringify(node[0], null, 2));

  // Check which zone has highest affinity
  const affinities = node[0].zoneAffinities as Record<string, Record<string, number>> | null;
  if (affinities) {
    console.log("\nZone affinities:");
    Object.entries(affinities).forEach(([frameworkId, zones]) => {
      console.log(`Framework ${frameworkId}:`);
      Object.entries(zones).forEach(([zoneKey, affinity]) => {
        console.log(`  ${zoneKey}: ${affinity}`);
      });
    });
  }
}

testZoneMove()
  .catch(console.error)
  .finally(() => {
    client.end();
    process.exit(0);
  });
