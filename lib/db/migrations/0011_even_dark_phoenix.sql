ALTER TABLE "CanvasNode" ADD COLUMN IF NOT EXISTS "hiddenInFrameworks" jsonb;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "frameworkId" uuid;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "reason" text;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "priority" varchar DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "impactScore" real;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "actionParams" jsonb;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "source" varchar DEFAULT 'ai-health-check' NOT NULL;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "appliedAt" timestamp;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "appliedById" uuid;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "dismissedAt" timestamp;--> statement-breakpoint
ALTER TABLE "CanvasSuggestion" ADD COLUMN IF NOT EXISTS "dismissedById" uuid;--> statement-breakpoint
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
