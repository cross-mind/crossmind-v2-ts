CREATE TABLE IF NOT EXISTS "CanvasNodePosition" (
	"nodeId" uuid NOT NULL,
	"frameworkId" uuid NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "CanvasNodePosition_nodeId_frameworkId_pk" PRIMARY KEY("nodeId","frameworkId")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasNodePosition" ADD CONSTRAINT "CanvasNodePosition_nodeId_CanvasNode_id_fk" FOREIGN KEY ("nodeId") REFERENCES "public"."CanvasNode"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasNodePosition" ADD CONSTRAINT "CanvasNodePosition_frameworkId_Framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."Framework"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_node_position_framework" ON "CanvasNodePosition" USING btree ("frameworkId");