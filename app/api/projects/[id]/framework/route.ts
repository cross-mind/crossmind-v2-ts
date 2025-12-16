import { auth } from "@/app/(auth)/auth";
import { getProjectFramework, setProjectFramework } from "@/lib/db/queries";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { projectFramework, projectFrameworkZone } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  // First try to get ProjectFramework (project-specific snapshot)
  const projectFrameworks = await db
    .select()
    .from(projectFramework)
    .where(
      and(
        eq(projectFramework.projectId, projectId),
        eq(projectFramework.isActive, true)
      )
    )
    .limit(1);

  if (projectFrameworks[0]) {
    // Return ProjectFramework with zones
    const zones = await db
      .select()
      .from(projectFrameworkZone)
      .where(eq(projectFrameworkZone.projectFrameworkId, projectFrameworks[0].id))
      .orderBy(asc(projectFrameworkZone.displayOrder));

    return Response.json({
      framework: { ...projectFrameworks[0], zones },
      projectFrameworkId: projectFrameworks[0].id,
    });
  }

  // Fallback: Return platform framework if no ProjectFramework exists
  const framework = await getProjectFramework(projectId);

  return Response.json({
    framework,
    projectFrameworkId: null,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { frameworkId } = await request.json();

  if (!frameworkId) {
    return new Response("Missing frameworkId", { status: 400 });
  }

  await setProjectFramework(projectId, frameworkId);

  return Response.json({ success: true });
}
