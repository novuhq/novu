-- Unified workflow activity counts migration
-- Merges interaction_counts functionality into workflow_activity_counts
-- Adds event_type column to track both message_sent and interaction events

-- Drop existing materialized views
DROP VIEW IF EXISTS workflow_activity_counts_mv;
DROP VIEW IF EXISTS interaction_counts_mv;

-- Drop existing tables
DROP TABLE IF EXISTS workflow_activity_counts;
DROP TABLE IF EXISTS interaction_counts;

-- Create unified workflow activity counts table with event_type
CREATE TABLE IF NOT EXISTS workflow_activity_counts (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String,
  external_subscriber_id String DEFAULT '',
  event_type LowCardinality(String),
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, workflow_id, date, external_subscriber_id, event_type);

-- Materialized view populates from traces table
-- Captures both message_sent events and interaction events
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_activity_counts_mv
TO workflow_activity_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  ifNull(external_subscriber_id, '') AS external_subscriber_id,
  event_type,
  1 AS count
FROM traces
WHERE event_type IN ('message_sent', 'message_seen', 'message_read', 'message_snoozed', 'message_archived');
