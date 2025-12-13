-- Add CHECK constraint to prevent parentId from referencing itself
ALTER TABLE "CanvasNode"
ADD CONSTRAINT "no_self_reference"
CHECK ("parentId" IS NULL OR "parentId" != "id");

