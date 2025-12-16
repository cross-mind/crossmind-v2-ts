-- ========== Part 1: Create New Tables ==========

-- Create ProjectFramework table
CREATE TABLE IF NOT EXISTS "ProjectFramework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"sourceFrameworkId" uuid,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"description" text NOT NULL,
	"healthScore" real,
	"lastHealthCheckAt" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint

-- Create ProjectFrameworkZone table
CREATE TABLE IF NOT EXISTS "ProjectFrameworkZone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectFrameworkId" uuid NOT NULL,
	"zoneKey" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint

-- Create FrameworkHealthDimension table
CREATE TABLE IF NOT EXISTS "FrameworkHealthDimension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"frameworkId" uuid NOT NULL,
	"dimensionKey" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"weight" real NOT NULL,
	"evaluationCriteria" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint

-- Create ProjectFrameworkHealthDimension table
CREATE TABLE IF NOT EXISTS "ProjectFrameworkHealthDimension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectFrameworkId" uuid NOT NULL,
	"dimensionKey" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"weight" real NOT NULL,
	"score" real,
	"insights" text,
	"lastEvaluatedAt" timestamp,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint

-- ========== Part 2: Extend Existing Tables ==========

-- Add ChatSession fields
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "type" varchar DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "status" varchar DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "projectFrameworkId" uuid;--> statement-breakpoint
ALTER TABLE "ChatSession" ADD COLUMN IF NOT EXISTS "archivedAt" timestamp;--> statement-breakpoint

-- Add CanvasNode.projectFrameworkId
ALTER TABLE "CanvasNode" ADD COLUMN IF NOT EXISTS "projectFrameworkId" uuid;--> statement-breakpoint

-- Rename CanvasSuggestion.frameworkId to projectFrameworkId
ALTER TABLE "CanvasSuggestion" RENAME COLUMN "frameworkId" TO "projectFrameworkId";--> statement-breakpoint

-- Add CanvasSuggestion.chatSessionId
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "chatSessionId" uuid;--> statement-breakpoint

-- ========== Part 3: Add Foreign Keys ==========

DO $$ BEGIN
 ALTER TABLE "ProjectFramework" ADD CONSTRAINT "ProjectFramework_projectId_Project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ProjectFramework" ADD CONSTRAINT "ProjectFramework_sourceFrameworkId_Framework_id_fk" FOREIGN KEY ("sourceFrameworkId") REFERENCES "public"."Framework"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ProjectFrameworkZone" ADD CONSTRAINT "ProjectFrameworkZone_projectFrameworkId_ProjectFramework_id_fk" FOREIGN KEY ("projectFrameworkId") REFERENCES "public"."ProjectFramework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "FrameworkHealthDimension" ADD CONSTRAINT "FrameworkHealthDimension_frameworkId_Framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."Framework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ProjectFrameworkHealthDimension" ADD CONSTRAINT "ProjectFrameworkHealthDimension_projectFrameworkId_ProjectFramework_id_fk" FOREIGN KEY ("projectFrameworkId") REFERENCES "public"."ProjectFramework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_projectFrameworkId_ProjectFramework_id_fk" FOREIGN KEY ("projectFrameworkId") REFERENCES "public"."ProjectFramework"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_projectFrameworkId_ProjectFramework_id_fk" FOREIGN KEY ("projectFrameworkId") REFERENCES "public"."ProjectFramework"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Update CanvasSuggestion foreign key (after rename)
DO $$ BEGIN
 ALTER TABLE "CanvasSuggestion" DROP CONSTRAINT IF EXISTS "CanvasSuggestion_frameworkId_Framework_id_fk";
EXCEPTION
 WHEN undefined_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "CanvasSuggestion" ADD CONSTRAINT "CanvasSuggestion_projectFrameworkId_ProjectFramework_id_fk" FOREIGN KEY ("projectFrameworkId") REFERENCES "public"."ProjectFramework"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "CanvasSuggestion" ADD CONSTRAINT "CanvasSuggestion_chatSessionId_ChatSession_id_fk" FOREIGN KEY ("chatSessionId") REFERENCES "public"."ChatSession"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- ========== Part 4: Create Indexes ==========

CREATE INDEX IF NOT EXISTS "idx_project_framework_project" ON "ProjectFramework" USING btree ("projectId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_framework_zone_unique" ON "ProjectFrameworkZone" USING btree ("projectFrameworkId","zoneKey");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_framework_health_dimension_unique" ON "FrameworkHealthDimension" USING btree ("frameworkId","dimensionKey");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_framework_health_dimension_unique" ON "ProjectFrameworkHealthDimension" USING btree ("projectFrameworkId","dimensionKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_session_type_status" ON "ChatSession" USING btree ("projectId","type","status");--> statement-breakpoint

-- ========== Part 5: Data Migration ==========

-- Migrate existing projects to create framework snapshots
-- This will be done in a separate data migration script to handle errors gracefully
-- See: lib/db/migrations/data/0012_migrate_project_frameworks.ts
