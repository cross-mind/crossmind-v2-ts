import { auth } from "@/app/(auth)/auth";
import { getNodeAffinitiesForFramework } from "@/lib/db/queries";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const projectId = searchParams.get("projectId");
  const frameworkId = searchParams.get("frameworkId");

  if (!projectId || !frameworkId) {
    return new Response("Missing parameters", { status: 400 });
  }

  // TODO: Check user has access to project

  const affinities = await getNodeAffinitiesForFramework(projectId, frameworkId);

  return Response.json({ affinities });
}
