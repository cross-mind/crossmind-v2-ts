ALTER TABLE "CanvasNode" ADD COLUMN "hiddenInFrameworks" jsonb;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "frameworkId" uuid;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "priority" varchar DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "impactScore" real;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "actionParams" jsonb;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "source" varchar DEFAULT 'ai-health-check' NOT NULL;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "appliedAt" timestamp;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "appliedById" uuid;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "dismissedAt" timestamp;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN "dismissedById" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasSuggestion" ADD CONSTRAINT "CanvasSuggestion_frameworkId_Framework_id_fk" FOREIGN KEY ("frameworkId") REFERENCES "public"."Framework"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasSuggestion" ADD CONSTRAINT "CanvasSuggestion_appliedById_User_id_fk" FOREIGN KEY ("appliedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CanvasSuggestion" ADD CONSTRAINT "CanvasSuggestion_dismissedById_User_id_fk" FOREIGN KEY ("dismissedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
