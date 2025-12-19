import { NextResponse } from "next/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import { chat, project, framework, frameworkZone, projectFramework, projectFrameworkZone } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { getProjectFramework } from "@/lib/db/queries";

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
    const { projectId, projectFrameworkId: inputProjectFrameworkId } = body;

    if (!projectId) {
      return new ChatSDKError(
        "bad_request:api",
        "Missing projectId"
      ).toResponse();
    }

    let finalProjectFrameworkId = inputProjectFrameworkId;

    // If no projectFrameworkId provided, create one from the project's default framework
    if (!finalProjectFrameworkId) {
      // Get project's default framework
      const [proj] = await db
        .select({ defaultFrameworkId: project.defaultFrameworkId })
        .from(project)
        .where(eq(project.id, projectId))
        .limit(1);

      if (!proj?.defaultFrameworkId) {
        return new ChatSDKError(
          "bad_request:api",
          "Project has no default framework set"
        ).toResponse();
      }

      // Get the platform framework details
      const [platformFramework] = await db
        .select()
        .from(framework)
        .where(eq(framework.id, proj.defaultFrameworkId))
        .limit(1);

      if (!platformFramework) {
        return new ChatSDKError(
          "bad_request:api",
          "Platform framework not found"
        ).toResponse();
      }

      // Get platform framework zones
      const platformZones = await db
        .select()
        .from(frameworkZone)
        .where(eq(frameworkZone.frameworkId, proj.defaultFrameworkId))
        .orderBy(frameworkZone.displayOrder);

      // Create ProjectFramework in a transaction
      const projectFrameworkId = generateUUID();
      const now = new Date();

      await db.transaction(async (tx) => {
        // Create ProjectFramework
        await tx.insert(projectFramework).values({
          id: projectFrameworkId,
          projectId,
          sourceFrameworkId: platformFramework.id,
          name: platformFramework.name,
          icon: platformFramework.icon,
          description: platformFramework.description,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        // Create ProjectFrameworkZones
        if (platformZones.length > 0) {
          await tx.insert(projectFrameworkZone).values(
            platformZones.map((zone) => ({
              id: generateUUID(),
              projectFrameworkId,
              zoneKey: zone.zoneKey,
              name: zone.name,
              description: zone.description,
              displayOrder: zone.displayOrder,
              sourceZoneId: zone.id,
              colorKey: zone.colorKey,
              createdAt: now,
            }))
          );
        }
      });

      finalProjectFrameworkId = projectFrameworkId;
      console.log('[Health Analysis Start] Created ProjectFramework:', projectFrameworkId);
    }

    // 获取框架信息用于会话标题
    const frameworkData = await getProjectFramework(projectId);
    const frameworkName = frameworkData?.name || "项目框架";

    // 使用事务确保原子性：归档旧会话并创建新会话
    const chatId = generateUUID();

    await db.transaction(async (tx) => {
      // 归档旧的健康分析会话（同一项目框架的）
      await tx
        .update(chat)
        .set({
          status: "archived",
          updatedAt: new Date(), // 添加更新时间戳
        })
        .where(
          and(
            eq(chat.type, "health-analysis"),
            eq(chat.status, "active"),
            eq(chat.projectFrameworkId, finalProjectFrameworkId)
          )
        );

      // 创建新的健康度分析会话（标题包含框架名称）
      await tx.insert(chat).values({
        id: chatId,
        userId: session.user.id,
        title: `${frameworkName} - 健康度分析`, // 包含框架名称
        visibility: "private",
        type: "health-analysis",
        status: "active",
        projectId,
        projectFrameworkId: finalProjectFrameworkId,
        createdAt: new Date(),
      });
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
