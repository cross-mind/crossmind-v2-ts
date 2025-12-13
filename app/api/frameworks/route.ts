import { auth } from "@/app/(auth)/auth";
import { getFrameworksForUser, createFramework, getFrameworkWithZones } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const frameworks = await getFrameworksForUser(session.user.id);

  // Load zones for each framework
  const frameworksWithZones = await Promise.all(
    frameworks.map(async (fw) => {
      const fullFramework = await getFrameworkWithZones(fw.id);
      return fullFramework;
    })
  );

  return Response.json({ frameworks: frameworksWithZones });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  // Validate request body
  const { name, icon, description, zones } = body;

  if (!name || !icon || !description || !zones || !Array.isArray(zones)) {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = await createFramework({
    name,
    icon,
    description,
    ownerId: session.user.id,
    zones,
  });

  return Response.json(result, { status: 201 });
}
