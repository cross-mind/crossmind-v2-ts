import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client, { schema });

/**
 * Health check function to verify database connectivity
 * @returns Promise that resolves to true if database is accessible, false otherwise
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    const startTime = Date.now();
    await client`SELECT 1 as ping`;
    const latency = Date.now() - startTime;
    return { connected: true, latency };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { connected: false, error: errorMessage };
  }
}
