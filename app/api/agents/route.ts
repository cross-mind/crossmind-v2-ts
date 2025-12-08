import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function GET() {
  try {
    // TODO: Implement agent service queries in queries.ts
    return NextResponse.json({
      services: [],
      message: "Agent Services API - GET (not yet implemented)",
    });
  } catch (error) {
    console.error("Error fetching agent services:", error);
    return NextResponse.json({ error: "Failed to fetch agent services" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, serviceId, userInput } = body;

    if (!projectId || !serviceId || !userInput) {
      return NextResponse.json(
        { error: "Project ID, service ID, and user input required" },
        { status: 400 },
      );
    }

    // TODO: Implement createAgentOrder in queries.ts
    return NextResponse.json({ message: "Agent Orders API - POST (not yet implemented)" });
  } catch (error) {
    console.error("Error creating agent order:", error);
    return NextResponse.json({ error: "Failed to create agent order" }, { status: 500 });
  }
}
