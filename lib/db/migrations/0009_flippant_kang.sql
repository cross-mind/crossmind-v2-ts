CREATE TABLE IF NOT EXISTS "CanvasNodeZoneAffinity" (
	"nodeId" uuid NOT NULL,
	"frameworkId" uuid NOT NULL,
	"zoneId" uuid NOT NULL,
	"affinityWeight" real NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "CanvasNodeZoneAffinity_nodeId_frameworkId_zoneId_pk" PRIMARY KEY("nodeId","frameworkId","zoneId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Framework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"description" text NOT NULL,
	"ownerId" uuid,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FrameworkZone" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"frameworkId" uuid NOT NULL,
	"zoneKey" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"colorKey" text NOT NULL,
	"displayOrder" real DEFAULT 0 NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "defaultFrameworkId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasNodeZoneAffinity" ADD CONSTRAINT "CanvasNodeZoneAffinity_nodeId_CanvasNode_id_fk" FOREIGN KEY ("nodeId") REFERENCES "public"."CanvasNode"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasNodeZoneAffinity" ADD CONSTRAINT "CanvasNodeZoneAffinity_frameworkId_Framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."Framework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasNodeZoneAffinity" ADD CONSTRAINT "CanvasNodeZoneAffinity_zoneId_FrameworkZone_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."FrameworkZone"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Framework" ADD CONSTRAINT "Framework_ownerId_User_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FrameworkZone" ADD CONSTRAINT "FrameworkZone_frameworkId_Framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."Framework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_affinity_lookup" ON "CanvasNodeZoneAffinity" USING btree ("nodeId","frameworkId","affinityWeight");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_zone_nodes" ON "CanvasNodeZoneAffinity" USING btree ("frameworkId","zoneId","affinityWeight");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_framework_owner" ON "Framework" USING btree ("ownerId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_framework_zone_unique" ON "FrameworkZone" USING btree ("frameworkId","zoneKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_framework_zone_order" ON "FrameworkZone" USING btree ("frameworkId","displayOrder");