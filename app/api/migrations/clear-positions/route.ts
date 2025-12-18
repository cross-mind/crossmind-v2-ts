import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db";
import { canvasNodePosition } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * One-time migration API: Clear all persisted canvas node positions
 *
 * Background:
 * - Old drag-drop logic saved positions to CanvasNodePosition table
 * - These persisted positions override affinity-based calculations
 * - This causes nodes to stay in old zones even after affinity updates
 *
 * Solution:
 * - Delete all records from CanvasNodePosition table
 * - Let layout engine recalculate positions from zoneAffinities
 *
 * Usage:
 *   curl -X POST http://localhost:8000/api/migrations/clear-positions
 */
export async function POST(request: Request) {
  const session = await auth();

  // Only allow authenticated users to run migrations
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Count existing records
    const existingRecords = await db.select().from(canvasNodePosition);
    const count = existingRecords.length;

    console.log(`[Migration] Found ${count} persisted positions`);

    if (count === 0) {
      return Response.json({
        success: true,
        message: "No records to delete",
        deletedCount: 0,
      });
    }

    // Show sample records in server logs
    console.log("[Migration] Sample records to delete:");
    existingRecords.slice(0, 5).forEach((record) => {
      console.log(
        `  - Node: ${record.nodeId}, Framework: ${record.projectFrameworkId}, Position: (${record.x}, ${record.y})`
      );
    });

    // Delete all records
    await db.delete(canvasNodePosition);

    console.log(`[Migration] ✅ Deleted all ${count} persisted positions`);
    console.log("[Migration] ✅ Canvas will now use affinity-based positioning");

    return Response.json({
      success: true,
      message: "Cleared all persisted positions successfully",
      deletedCount: count,
      note: "Users should reload Canvas pages to see updated layouts",
    });
  } catch (error) {
    console.error("[Migration] Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
