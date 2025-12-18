-- Migration: Refactor ProjectFrameworkHealthDimension table
-- Remove unnecessary fields: name, description, weight, lastEvaluatedAt, displayOrder
-- These fields should be derived from framework definition or hardcoded in code

-- Drop columns that are no longer needed
ALTER TABLE "ProjectFrameworkHealthDimension" DROP COLUMN IF EXISTS "name";
ALTER TABLE "ProjectFrameworkHealthDimension" DROP COLUMN IF EXISTS "description";
ALTER TABLE "ProjectFrameworkHealthDimension" DROP COLUMN IF EXISTS "weight";
ALTER TABLE "ProjectFrameworkHealthDimension" DROP COLUMN IF EXISTS "lastEvaluatedAt";
ALTER TABLE "ProjectFrameworkHealthDimension" DROP COLUMN IF EXISTS "displayOrder";

-- Make score NOT NULL (it should always have a value when dimension is evaluated)
ALTER TABLE "ProjectFrameworkHealthDimension" ALTER COLUMN "score" SET NOT NULL;
