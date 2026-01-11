-- Unified workflow activity counts table
-- Handles both message counts and subscriber activity from traces table (message_sent events)

CREATE TABLE IF NOT EXISTS workflow_activity_counts (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String,
  external_subscriber_id String DEFAULT '',
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, workflow_id, date, external_subscriber_id);

-- Materialized view populates from traces table (message_sent events)
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_activity_counts_mv
TO workflow_activity_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  workflow_id,
  ifNull(external_subscriber_id, '') AS external_subscriber_id,
  1 AS count
FROM traces
WHERE event_type = 'message_sent';
