import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { canvasNode } from "../lib/db/schema";
import { sql } from "drizzle-orm";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function testDisplayOrder() {
  console.log("Testing displayOrder field...\n");

  try {
    // Check if displayOrder column exists
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'CanvasNode' AND column_name = 'displayOrder';
    `);

    console.log("DisplayOrder column info:", result.rows);

    // Get a few sample nodes to see displayOrder values
    const nodes = await db
      .select({
        id: canvasNode.id,
        title: canvasNode.title,
        displayOrder: canvasNode.displayOrder,
        parentId: canvasNode.parentId,
        createdAt: canvasNode.createdAt,
      })
      .from(canvasNode)
      .limit(10);

    console.log("\nSample nodes with displayOrder:");
    nodes.forEach((node) => {
      console.log(
        `  - ${node.title.substring(0, 30).padEnd(30)} | Order: ${node.displayOrder} | Parent: ${node.parentId || "null"}`
      );
    });

    console.log("\n✅ DisplayOrder field exists and working!");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

testDisplayOrder();
