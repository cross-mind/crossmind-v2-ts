# Data Migrations

This directory contains data migration scripts that transform existing data after schema changes.

## Health Analysis Migration (0012)

**File**: `0012_migrate_project_frameworks.ts`

**Purpose**: Migrate from platform-level frameworks to project-level framework snapshots.

**What it does**:
1. Creates `ProjectFramework` snapshot for each project from its default framework
2. Copies zones from platform `Framework` to project `ProjectFrameworkZone`
3. Updates `CanvasNode.projectFrameworkId` based on node positions data
4. Rewrites `CanvasNode.zoneAffinities` JSONB keys (frameworkId → projectFrameworkId)
5. Updates `CanvasSuggestion.projectFrameworkId` for all suggestions in each project

**How to run**:

### Option 1: Complete Migration (Recommended)
```bash
# Run from project root
npx tsx scripts/run-health-analysis-migration.ts
```

This runs both data migration and platform framework seeding.

### Option 2: Schema + Data Migration
```bash
# Step 1: Push schema changes
pnpm db:push

# Step 2: Run data migration
npx tsx lib/db/migrations/data/0012_migrate_project_frameworks.ts

# Step 3: Seed platform frameworks
npx tsx -e "import { seedPlatformFrameworks } from './lib/db/seed-frameworks.ts'; await seedPlatformFrameworks();"
```

### Option 3: Shell Script (Unix/Linux/macOS)
```bash
# Make executable (first time only)
chmod +x scripts/run-health-analysis-migration.sh

# Run migration
./scripts/run-health-analysis-migration.sh
```

**Rollback**:

There is no automatic rollback. If you need to rollback:
1. Restore database from backup
2. Revert schema changes in `lib/db/schema.ts`
3. Run `pnpm db:push`

**Verification**:

After migration, verify:
```sql
-- Check ProjectFramework created
SELECT COUNT(*) FROM "ProjectFramework";

-- Check zones copied
SELECT COUNT(*) FROM "ProjectFrameworkZone";

-- Check nodes updated
SELECT COUNT(*) FROM "CanvasNode" WHERE "projectFrameworkId" IS NOT NULL;

-- Check suggestions updated
SELECT COUNT(*) FROM "CanvasSuggestion" WHERE "projectFrameworkId" IS NOT NULL;
```

**Notes**:
- Safe to run multiple times (idempotent for framework creation)
- Nodes and suggestions will be re-processed each time
- Errors for individual projects are logged but don't stop the migration
- Projects without a default framework are skipped
