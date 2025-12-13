import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { canvasNodePosition } from "../lib/db/schema.js";
import { eq } from "drizzle-orm";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function checkPositions() {
  const frameworkId = "14beb046-6b44-46c2-ae65-257cb6c05463"; // SaaS 健康度

  const positions = await db
    .select()
    .from(canvasNodePosition)
    .where(eq(canvasNodePosition.frameworkId, frameworkId))
    .limit(30);

  console.log(`Found ${positions.length} node positions for framework:`);
  positions.forEach((pos) => {
    console.log(`  Node ${pos.nodeId.substring(0, 8)}: (${pos.x}, ${pos.y}) - updated: ${pos.updatedAt}`);
  });

  // Group by Y coordinate to see layout distribution
  const yGroups = new Map<number, number>();
  positions.forEach(pos => {
    const y = Math.round(pos.y / 100) * 100; // Group by 100px increments
    yGroups.set(y, (yGroups.get(y) || 0) + 1);
  });

  console.log("\nY-coordinate distribution:");
  Array.from(yGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([y, count]) => {
      console.log(`  Y=${y}: ${count} nodes`);
    });
}

checkPositions()
  .catch(console.error)
  .finally(() => {
    client.end();
    process.exit(0);
  });
