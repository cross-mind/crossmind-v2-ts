import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { chat } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

/**
 * 创建健康度分析会话
 * POST /api/canvas/health-analysis/start
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const body = await request.json();
    const { projectId, projectFrameworkId } = body;

    if (!projectId || !projectFrameworkId) {
      return new ChatSDKError(
        "bad_request:api",
        "Missing projectId or projectFrameworkId"
      ).toResponse();
    }

    // 归档旧的健康分析会话（同一项目框架的）
    await db
      .update(chat)
      .set({ status: "archived" })
      .where(
        and(
          eq(chat.type, "health-analysis"),
          eq(chat.status, "active"),
          eq(chat.projectFrameworkId, projectFrameworkId)
        )
      );

    // 创建新的健康度分析会话
    const chatId = generateUUID();

    await db.insert(chat).values({
      id: chatId,
      userId: session.user.id,
      title: "健康度分析",
      visibility: "private",
      type: "health-analysis",
      status: "active",
      projectId,
      projectFrameworkId,
      createdAt: new Date(),
    });

    // 生成初始引导消息
    const initialMessage = `我将帮助您分析项目的健康度。我会通过查看各个区域和节点的内容，评估框架的完整性、清晰度、平衡性和逻辑性。

让我开始分析...`;

    return NextResponse.json({
      chatId,
      initialMessage,
    });
  } catch (error) {
    console.error("[Health Analysis Start Error]", error);
    return new ChatSDKError("bad_request:api").toResponse();
  }
}
