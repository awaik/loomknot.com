-- Activity Log Partitioning by Month
-- Run this ONCE when activity_log exceeds ~1M rows or after 6+ months of production use.
--
-- Drizzle ORM does not support partitioned tables natively, so this is managed via raw SQL.
-- After applying, drizzle-kit push will still manage columns/indexes, but the table itself
-- is partitioned by PostgreSQL.
--
-- IMPORTANT: This is a one-time migration. Back up data before running.
-- Steps:
--   1. Rename existing table
--   2. Create partitioned table with same schema
--   3. Copy data into partitioned table
--   4. Drop old table
--   5. Create initial monthly partitions
--   6. Set up auto-partition creation (pg_partman or cron)

BEGIN;

-- Step 1: Rename existing table
ALTER TABLE activity_log RENAME TO activity_log_old;

-- Step 2: Create partitioned table
CREATE TABLE activity_log (
  id varchar(36) NOT NULL,
  project_id varchar(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id varchar(36) REFERENCES users(id) ON DELETE SET NULL,
  api_key_id varchar(36) REFERENCES api_keys(id) ON DELETE SET NULL,
  action varchar(50) NOT NULL,
  target_type varchar(50) NOT NULL,
  target_id varchar(36) NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Step 3: Create indexes on partitioned table
CREATE INDEX activity_log_project_created_idx ON activity_log (project_id, created_at);
CREATE INDEX activity_log_target_idx ON activity_log (target_type, target_id);
CREATE INDEX activity_log_user_id_idx ON activity_log (user_id);
CREATE INDEX activity_log_created_at_idx ON activity_log (created_at);

-- Step 4: Create partitions (adjust dates for your launch timeline)
-- Template: one partition per month
CREATE TABLE activity_log_y2026m03 PARTITION OF activity_log
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE activity_log_y2026m04 PARTITION OF activity_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE activity_log_y2026m05 PARTITION OF activity_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE activity_log_y2026m06 PARTITION OF activity_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE activity_log_y2026m07 PARTITION OF activity_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE activity_log_y2026m08 PARTITION OF activity_log
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Step 5: Copy data from old table
INSERT INTO activity_log SELECT * FROM activity_log_old;

-- Step 6: Drop old table
DROP TABLE activity_log_old;

COMMIT;

-- RETENTION POLICY: Drop partitions older than 12 months
-- Run monthly via cron or pg_cron:
--   DROP TABLE IF EXISTS activity_log_y2025m03;
--
-- Alternatively, install pg_partman for automatic partition management:
--   CREATE EXTENSION pg_partman;
--   SELECT partman.create_parent('public.activity_log', 'created_at', 'native', 'monthly');
--   UPDATE partman.part_config SET retention = '12 months', retention_keep_table = false
--     WHERE parent_table = 'public.activity_log';
