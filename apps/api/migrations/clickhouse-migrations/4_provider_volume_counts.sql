-- Provider volume counts table
-- Pre-aggregates completed step runs by provider for efficient volume queries
-- Handles message volume per provider from step_runs table

CREATE TABLE IF NOT EXISTS provider_volume_counts (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String DEFAULT '',
  provider_id String,
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, date, workflow_id, provider_id);

-- Materialized view populates from step_runs table (completed messaging steps)
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_volume_counts_mv
TO provider_volume_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  ifNull(provider_id, '') AS provider_id,
  1 AS count
FROM step_runs
WHERE 
  status = 'completed'
  AND step_type IN ('in_app', 'email', 'sms', 'chat', 'push');
