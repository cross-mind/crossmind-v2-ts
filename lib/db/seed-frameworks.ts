import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import { framework, frameworkZone, frameworkHealthDimension } from "./schema";
import frameworksConfig from "@/config/frameworks.json";

config({ path: ".env.local" });

const client = postgres(process.env.POSTGRES_URL!, { max: 1 });
const db = drizzle(client);

/**
 * 导入平台级框架配置数据
 * 幂等性：重复执行安全，已存在的框架不会重复插入
 */
export async function seedPlatformFrameworks() {
  console.log("[Seed] 开始导入平台级框架配置...");

  for (const fw of frameworksConfig.frameworks) {
    // 检查框架是否已存在
    const [existing] = await db
      .select()
      .from(framework)
      .where(eq(framework.name, fw.name))
      .limit(1);

    if (existing) {
      console.log(`[Seed] 框架 "${fw.name}" 已存在，跳过`);
      continue;
    }

    console.log(`[Seed] 创建框架: ${fw.name}`);

    // 创建框架
    const [newFramework] = await db
      .insert(framework)
      .values({
        name: fw.name,
        icon: fw.icon,
        description: fw.description,
        ownerId: null, // 平台级框架
        visibility: "public",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 创建区域
    console.log(`[Seed] 创建 ${fw.zones.length} 个区域`);
    await db.insert(frameworkZone).values(
      fw.zones.map((z) => ({
        frameworkId: newFramework.id,
        zoneKey: z.zoneKey,
        name: z.name,
        description: z.description || null,
        colorKey: z.colorKey,
        displayOrder: z.displayOrder,
        createdAt: new Date(),
      }))
    );

    // 创建健康度维度
    console.log(`[Seed] 创建 ${fw.healthDimensions.length} 个健康度维度`);
    await db.insert(frameworkHealthDimension).values(
      fw.healthDimensions.map((d) => ({
        frameworkId: newFramework.id,
        dimensionKey: d.dimensionKey,
        name: d.name,
        description: d.description || null,
        weight: d.weight,
        evaluationCriteria: d.evaluationCriteria,
        displayOrder: d.displayOrder,
        createdAt: new Date(),
      }))
    );

    console.log(`[Seed] 框架 "${fw.name}" 导入完成`);
  }

  console.log("[Seed] 平台级框架配置导入完成");
}

/**
 * 主函数：执行种子数据导入
 */
export async function runSeed() {
  try {
    await seedPlatformFrameworks();
    console.log("✅ 种子数据导入成功");
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ 种子数据导入失败:", error);
    await client.end();
    process.exit(1);
  }
}

// 如果直接执行此文件，运行种子数据导入
if (require.main === module) {
  runSeed();
}
