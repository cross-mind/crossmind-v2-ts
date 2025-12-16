-- Migration: Update CanvasNodePosition to use ProjectFramework instead of Framework

-- Step 1: Drop existing data (positions will be recalculated)
DELETE FROM "CanvasNodePosition";
--> statement-breakpoint

-- Step 2: Drop old constraints and indexes
DO $$ BEGIN
 ALTER TABLE "CanvasNodePosition" DROP CONSTRAINT IF EXISTS "CanvasNodePosition_frameworkId_Framework_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint

DROP INDEX IF EXISTS "idx_node_position_framework";
--> statement-breakpoint

-- Step 3: Rename column
ALTER TABLE "CanvasNodePosition" RENAME COLUMN "frameworkId" TO "projectFrameworkId";
--> statement-breakpoint

-- Step 4: Add new foreign key constraint
DO $$ BEGIN
 ALTER TABLE "CanvasNodePosition" ADD CONSTRAINT "CanvasNodePosition_projectFrameworkId_ProjectFramework_id_fk" FOREIGN KEY ("projectFrameworkId") REFERENCES "public"."ProjectFramework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Step 5: Create new index
CREATE INDEX IF NOT EXISTS "idx_node_position_project_framework" ON "CanvasNodePosition" USING btree ("projectFrameworkId");
--> statement-breakpoint
