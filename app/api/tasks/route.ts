import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 });
    }

    // TODO: Implement task queries in queries.ts
    return NextResponse.json({ tasks: [], message: "Tasks API - GET (not yet implemented)" });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, title, description, status, priority } = body;

    if (!projectId || !title) {
      return NextResponse.json({ error: "Project ID and title required" }, { status: 400 });
    }

    // TODO: Implement createTask in queries.ts
    return NextResponse.json({ message: "Tasks API - POST (not yet implemented)" });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
