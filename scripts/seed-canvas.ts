/**
 * Seed script to create a default project and some Canvas nodes for testing
 * Run with: npx tsx scripts/seed-canvas.ts
 */

import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { project, canvasNode, user } from "../lib/db/schema";
import { eq } from "drizzle-orm";

config({ path: ".env.local" });

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function seed() {
  console.log("🌱 Seeding Canvas data...");

  try {
    // 1. Get or create a test user
    let [testUser] = await db.select().from(user).where(eq(user.email, "test@example.com"));

    if (!testUser) {
      console.log("Creating test user...");
      [testUser] = await db
        .insert(user)
        .values({
          email: "test@example.com",
          password: "hashed_password_placeholder",
        })
        .returning();
      console.log(`✅ Created test user: ${testUser.id}`);
    } else {
      console.log(`✅ Found existing test user: ${testUser.id}`);
    }

    // 2. Create a default project
    console.log("Creating default project...");
    const [defaultProject] = await db
      .insert(project)
      .values({
        name: "Demo Canvas Project",
        description: "A demo project for testing Canvas functionality",
        ownerId: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`✅ Created project: ${defaultProject.id}`);
    console.log(`   Project name: ${defaultProject.name}`);

    // 3. Create some sample Canvas nodes
    console.log("Creating sample Canvas nodes...");

    const sampleNodes = [
      {
        projectId: defaultProject.id,
        title: "Product Vision",
        content:
          "Building a next-generation project management tool that combines AI with visual thinking frameworks.",
        type: "document" as const,
        tags: ["stage/ideation", "priority/high"],
        positions: {
          "product-dev": { x: 100, y: 100 },
        },
        createdById: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: defaultProject.id,
        title: "User Research Findings",
        content:
          "Key insight: Users struggle with context switching between different project views. They want a unified canvas experience.",
        type: "document" as const,
        tags: ["stage/research"],
        positions: {
          "product-dev": { x: 100, y: 400 },
        },
        createdById: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: defaultProject.id,
        title: "Implement Canvas Drag & Drop",
        content: "Add drag-and-drop functionality for rearranging nodes on the canvas.",
        type: "task" as const,
        taskStatus: "in-progress" as const,
        tags: ["stage/dev", "priority/high"],
        positions: {
          "product-dev": { x: 500, y: 100 },
        },
        createdById: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: defaultProject.id,
        title: "Design System Tokens",
        content: "Define color palette, typography scale, and spacing tokens for consistent design.",
        type: "idea" as const,
        tags: ["stage/design"],
        positions: {
          "product-dev": { x: 500, y: 400 },
        },
        createdById: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        projectId: defaultProject.id,
        title: '"The best products are invisible"',
        content: "Quote from Don Norman's Design of Everyday Things - reminds us to focus on user flow.",
        type: "inspiration" as const,
        source: "Design of Everyday Things by Don Norman",
        tags: ["stage/ideation"],
        positions: {
          "product-dev": { x: 900, y: 100 },
        },
        createdById: testUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const nodeData of sampleNodes) {
      const [node] = await db.insert(canvasNode).values(nodeData).returning();
      console.log(`✅ Created node: "${node.title}" (${node.type})`);
    }

    console.log("\n🎉 Seeding complete!");
    console.log(`\n📝 Project ID: ${defaultProject.id}`);
    console.log(`   Test page: http://localhost:3000/canvas/test-page?projectId=${defaultProject.id}`);
    console.log(`   Main Canvas: http://localhost:3000/canvas?projectId=${defaultProject.id}`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
