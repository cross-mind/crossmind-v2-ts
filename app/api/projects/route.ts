import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getProjectsByUserId, createProject } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id as string;
    console.log("[Projects API] Fetching projects for user:", userId);
    const projects = await getProjectsByUserId({ userId });
    console.log("[Projects API] Found projects:", projects.length, projects.map(p => ({ id: p.id, name: p.name })));
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("[Projects API] Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const newProject = await createProject({
      name: name.trim(),
      description: description?.trim() || undefined,
      ownerId: session.user.id as string
    });

    return NextResponse.json({ project: newProject }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
