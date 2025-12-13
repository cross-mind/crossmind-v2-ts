import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { frameworkZone } from "../lib/db/schema.js";
import { eq } from "drizzle-orm";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function testZoneNames() {
  const frameworkId = "14beb046-6b44-46c2-ae65-257cb6c05463";

  const zones = await db
    .select({
      id: frameworkZone.id,
      zoneKey: frameworkZone.zoneKey,
      name: frameworkZone.name,
    })
    .from(frameworkZone)
    .where(eq(frameworkZone.frameworkId, frameworkId));

  console.log("Zones for framework:");
  zones.forEach((zone) => {
    console.log(`  ${zone.id}: ${zone.name} (${zone.zoneKey})`);
  });
}

testZoneNames()
  .catch(console.error)
  .finally(() => {
    client.end();
    process.exit(0);
  });
