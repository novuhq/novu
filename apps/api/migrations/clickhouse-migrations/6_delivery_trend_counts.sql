-- Delivery trend counts table
-- Pre-aggregates completed step runs by step_type and date for efficient delivery trend queries
-- Handles message delivery volume per channel type from step_runs table

CREATE TABLE IF NOT EXISTS delivery_trend_counts (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String DEFAULT '',
  step_type LowCardinality(String),
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, date, workflow_id, step_type);

-- Materialized view populates from step_runs table (completed messaging steps)
CREATE MATERIALIZED VIEW IF NOT EXISTS delivery_trend_counts_mv
TO delivery_trend_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  step_type,
  1 AS count
FROM step_runs
WHERE 
  status = 'completed'
  AND step_type IN ('in_app', 'email', 'sms', 'chat', 'push');
