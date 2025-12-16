import { auth } from "@/app/(auth)/auth";
import { batchUpdateNodePositions, getNodePositions } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectFrameworkId = searchParams.get("projectFrameworkId");
  const nodeIdsParam = searchParams.get("nodeIds");

  if (!projectFrameworkId || !nodeIdsParam) {
    return new Response("Missing parameters", { status: 400 });
  }

  const nodeIds = nodeIdsParam.split(",");

  const positions = await getNodePositions(projectFrameworkId, nodeIds);

  return Response.json({ positions });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { projectFrameworkId, positions } = body; // { projectFrameworkId, positions: [{ nodeId, x, y }] }

  if (!projectFrameworkId || !positions || !Array.isArray(positions)) {
    return new Response("Missing parameters", { status: 400 });
  }

  // TODO: Verify user owns the nodes' project

  await batchUpdateNodePositions(projectFrameworkId, positions);

  return Response.json({ success: true });
}
