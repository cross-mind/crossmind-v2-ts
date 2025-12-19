import { auth } from "@/app/(auth)/auth";
import { getProjectFramework, setProjectFramework, getProjectFrameworkDimensions } from "@/lib/db/queries";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { project, projectFramework, projectFrameworkZone } from "@/lib/db/schema";
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

  // First get the project's default framework ID
  const projects = await db
    .select({ defaultFrameworkId: project.defaultFrameworkId })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);

  const defaultFrameworkId = projects[0]?.defaultFrameworkId;

  if (!defaultFrameworkId) {
    return Response.json({
      framework: null,
      projectFrameworkId: null,
      dimensions: [],
    });
  }

  // Try to get ProjectFramework for the current framework
  const projectFrameworks = await db
    .select()
    .from(projectFramework)
    .where(
      and(
        eq(projectFramework.projectId, projectId),
        eq(projectFramework.sourceFrameworkId, defaultFrameworkId),
        eq(projectFramework.isActive, true)
      )
    )
    .limit(1);

  if (projectFrameworks[0]) {
    // Return ProjectFramework with zones and dimension health scores
    const zones = await db
      .select()
      .from(projectFrameworkZone)
      .where(eq(projectFrameworkZone.projectFrameworkId, projectFrameworks[0].id))
      .orderBy(asc(projectFrameworkZone.displayOrder));

    const dimensions = await getProjectFrameworkDimensions(projectFrameworks[0].id);

    return Response.json({
      framework: { ...projectFrameworks[0], zones },
      projectFrameworkId: projectFrameworks[0].id,
      dimensions,
    });
  }

  // Fallback: Return platform framework if no ProjectFramework exists
  const framework = await getProjectFramework(projectId);

  return Response.json({
    framework,
    projectFrameworkId: null,
    dimensions: [], // No dimensions for platform frameworks
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
