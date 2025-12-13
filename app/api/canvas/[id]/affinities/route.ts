import { auth } from "@/app/(auth)/auth";
import { updateNodeAffinities } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { frameworkId, affinities } = body; // { zoneKey: weight }

  if (!frameworkId || !affinities) {
    return new Response("Missing parameters", { status: 400 });
  }

  // TODO: Verify user owns the node's project

  await updateNodeAffinities(nodeId, frameworkId, affinities);

  return Response.json({ success: true });
}
