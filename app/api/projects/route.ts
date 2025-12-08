import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getProjectsByUserId, createProject } from "@/lib/db/queries";
import type { Project } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // TODO: Implement getProjectsByUserId in queries.ts
    // const projects = await getProjectsByUserId(session.user.id as string);
    return NextResponse.json({ projects: [], message: "Projects API - GET (not yet implemented)" });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
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

    // TODO: Implement createProject in queries.ts
    // const newProject = await createProject({ name, description, ownerId: session.user.id as string });
    return NextResponse.json({ message: "Projects API - POST (not yet implemented)" });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
