import { auth } from "@/app/(auth)/auth";
import { getFrameworkWithZones } from "@/lib/db/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const framework = await getFrameworkWithZones(id);

  if (!framework) {
    return new Response("Framework not found", { status: 404 });
  }

  // Check access: platform frameworks or user-owned
  if (framework.ownerId && framework.ownerId !== session?.user?.id) {
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json({ framework });
}
