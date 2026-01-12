-- Interaction counts table
-- Pre-aggregates user interaction events (seen, read, snoozed, archived) for efficient querying
-- Handles interaction volume per event type from traces table

CREATE TABLE IF NOT EXISTS interaction_counts (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String DEFAULT '',
  event_type LowCardinality(String),
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, date, workflow_id, event_type);

-- Materialized view populates from traces table (interaction events)
CREATE MATERIALIZED VIEW IF NOT EXISTS interaction_counts_mv
TO interaction_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  event_type,
  1 AS count
FROM traces
WHERE 
  entity_type = 'step_run'
  AND event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived');
