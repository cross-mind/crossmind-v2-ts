-- Add displayOrder field to CanvasNode table
ALTER TABLE "CanvasNode" ADD COLUMN "displayOrder" real DEFAULT 0 NOT NULL;

-- Initialize displayOrder for existing nodes (按 createdAt 排序)
WITH ordered_nodes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt") * 1000.0 AS new_order
  FROM "CanvasNode"
)
UPDATE "CanvasNode"
SET "displayOrder" = ordered_nodes.new_order
FROM ordered_nodes
WHERE "CanvasNode".id = ordered_nodes.id;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS "idx_canvas_node_display_order"
ON "CanvasNode" ("projectId", "displayOrder");
