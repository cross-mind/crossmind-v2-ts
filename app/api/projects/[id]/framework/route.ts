import { auth } from "@/app/(auth)/auth";
import { getProjectFramework, setProjectFramework, getFrameworksForUser, getFrameworkWithZones } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const framework = await getProjectFramework(projectId);

  if (!framework) {
    // Return first platform framework as fallback (with zones)
    // Pass undefined to get only platform frameworks
    const platformFrameworks = await getFrameworksForUser();

    if (platformFrameworks[0]) {
      const frameworkWithZones = await getFrameworkWithZones(platformFrameworks[0].id);
      return Response.json({ framework: frameworkWithZones });
    }
    return Response.json({ framework: null });
  }

  return Response.json({ framework });
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
