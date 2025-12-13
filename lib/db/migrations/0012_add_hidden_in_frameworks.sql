-- Add hiddenInFrameworks JSONB column to CanvasNode table
-- This field stores framework-specific visibility state for each node
-- Structure: { "framework-id": boolean }
-- Example: { "product-dev": true, "business-canvas": false }

ALTER TABLE "CanvasNode"
ADD COLUMN "hiddenInFrameworks" jsonb DEFAULT '{}'::jsonb;

-- Optional: Add GIN index for JSONB queries (improves query performance)
CREATE INDEX IF NOT EXISTS "idx_hidden_in_frameworks"
ON "CanvasNode" USING GIN ("hiddenInFrameworks");
