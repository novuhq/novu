-- Workflow volume counts table
-- Pre-aggregates workflow run counts by workflow_name and date for efficient volume queries
-- Handles workflow volume metrics from workflow_runs table

CREATE TABLE IF NOT EXISTS workflow_volume_counts (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String,
  workflow_name String,
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, date, workflow_id, workflow_name);

-- Materialized view populates from workflow_runs table
-- Only counts initial workflow run creation (status = 'processing'), not status updates
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_volume_counts_mv
TO workflow_volume_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  workflow_id,
  workflow_name,
  1 AS count
FROM workflow_runs
WHERE status = 'processing';
