-- Enhance CanvasSuggestion table with framework association, priority, impact tracking, and lifecycle fields
-- This migration adds support for:
-- 1. Framework-level suggestions (frameworkId)
-- 2. Priority and impact scoring system
-- 3. Enhanced action parameters (JSONB)
-- 4. Lifecycle tracking (applied/dismissed by user and timestamp)
-- 5. New suggestion type: content-suggestion (conversational optimization)

-- Add framework association
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "frameworkId" uuid REFERENCES "Framework"("id") ON DELETE SET NULL;

-- Add reason field (why this suggestion is recommended)
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "reason" text;

-- Add priority field with default value
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "priority" varchar NOT NULL DEFAULT 'medium';

-- Add impact score field (0-100)
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "impactScore" real;

-- Add action parameters JSONB field
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "actionParams" jsonb;

-- Add source field (how the suggestion was created)
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "source" varchar NOT NULL DEFAULT 'ai-health-check';

-- Add lifecycle tracking fields
ALTER TABLE "CanvasSuggestion"
ADD COLUMN "appliedAt" timestamp;

ALTER TABLE "CanvasSuggestion"
ADD COLUMN "appliedById" uuid REFERENCES "User"("id");

ALTER TABLE "CanvasSuggestion"
ADD COLUMN "dismissedAt" timestamp;

ALTER TABLE "CanvasSuggestion"
ADD COLUMN "dismissedById" uuid REFERENCES "User"("id");

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_suggestion_framework"
ON "CanvasSuggestion" ("frameworkId", "status");

CREATE INDEX IF NOT EXISTS "idx_suggestion_priority"
ON "CanvasSuggestion" ("priority", "impactScore");

CREATE INDEX IF NOT EXISTS "idx_suggestion_node"
ON "CanvasSuggestion" ("nodeId", "status");

-- Add GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS "idx_suggestion_action_params"
ON "CanvasSuggestion" USING GIN ("actionParams");

-- Note: The type column enum update ("content-suggestion") is handled by Drizzle ORM at application level
-- PostgreSQL varchar doesn't enforce enum constraints at DB level
