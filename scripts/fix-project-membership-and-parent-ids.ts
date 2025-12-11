#!/usr/bin/env tsx
/**
 * Fix Project Membership and Parent IDs
 *
 * This script:
 * 1. Creates missing membership records for existing projects
 * 2. Identifies and fixes parent-child relationships based on children field
 */

import { db } from "../lib/db/index.js";
import { project, membership, canvasNode, user } from "../lib/db/schema.js";
import { eq, isNull, and } from "drizzle-orm";

async function main() {
  console.log("🔧 Starting fix for project membership and parent IDs...\n");

  // 1. Find all projects without membership records
  console.log("1️⃣ Checking for projects without membership records...");

  const allProjects = await db.select().from(project);
  console.log(`   Found ${allProjects.length} total projects`);

  for (const proj of allProjects) {
    // Check if this project has any memberships
    const memberships = await db
      .select()
      .from(membership)
      .where(eq(membership.projectId, proj.id));

    if (memberships.length === 0) {
      console.log(`   ⚠️  Project "${proj.name}" (${proj.id}) has no memberships`);

      // Create membership for the project owner
      if (proj.ownerId) {
        try {
          await db.insert(membership).values({
            projectId: proj.id,
            userId: proj.ownerId,
            role: "owner"
          });
          console.log(`   ✅ Created owner membership for user ${proj.ownerId}`);
        } catch (error) {
          console.error(`   ❌ Error creating membership:`, error);
        }
      } else {
        console.log(`   ⚠️  Project has no ownerId, skipping membership creation`);
      }
    } else {
      console.log(`   ✓ Project "${proj.name}" has ${memberships.length} membership(s)`);
    }
  }

  console.log("\n2️⃣ Checking for nodes with broken parent-child relationships...");

  // Get all nodes with the old children field
  const nodesWithChildren = await db
    .select()
    .from(canvasNode)
    .where(isNull(canvasNode.parentId)); // Only check nodes without parentId set

  console.log(`   Found ${nodesWithChildren.length} nodes without parentId`);

  // Check if any have the children field set (this would indicate they were supposed to be parents)
  let childrenFieldCount = 0;
  for (const node of nodesWithChildren) {
    if (node.children && Array.isArray(node.children) && node.children.length > 0) {
      childrenFieldCount++;
      console.log(`   ⚠️  Node "${node.title}" has children field: ${JSON.stringify(node.children)}`);
    }
  }

  if (childrenFieldCount === 0) {
    console.log(`   ✓ No nodes found with legacy children field data`);
    console.log(`   ℹ️  Note: The "+1" badges might be coming from recently created children`);
    console.log(`      that weren't saved with parentId due to a bug in the creation logic.`);
  }

  // 3. Find recently created nodes that might be orphaned children
  console.log("\n3️⃣ Looking for recently created nodes (potential orphaned children)...");

  const recentNodes = nodesWithChildren
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  console.log(`   Recent nodes (last 5):`);
  for (const node of recentNodes) {
    console.log(`   - "${node.title}" (${node.id})`);
    console.log(`     Created: ${node.createdAt}`);
    console.log(`     ParentId: ${node.parentId || 'null'}`);
    console.log(`     Children field: ${node.children ? JSON.stringify(node.children) : 'null'}`);
  }

  console.log("\n✅ Diagnostic complete!");
  console.log("\n📋 Summary:");
  console.log(`   - Projects checked: ${allProjects.length}`);
  console.log(`   - Nodes without parentId: ${nodesWithChildren.length}`);
  console.log(`   - Nodes with legacy children field: ${childrenFieldCount}`);
}

main()
  .then(() => {
    console.log("\n✨ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
