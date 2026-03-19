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

-- Add provider_id column to traces table
-- This column stores the provider ID that was used to send the message
-- Must be added before creating the materialized view that references it
ALTER TABLE traces
ADD COLUMN IF NOT EXISTS provider_id String DEFAULT '';

-- Trace rollup table
-- Handles both message counts and subscriber activity from traces table
-- Captures message_sent events and interaction events (seen, read, snoozed, archived)
CREATE TABLE IF NOT EXISTS trace_rollup (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String,
  external_subscriber_id String DEFAULT '',
  event_type LowCardinality(String),
  provider_id String DEFAULT '',
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, event_type, date, workflow_id, external_subscriber_id, provider_id);

-- Materialized view populates from traces table
-- Captures both message_sent events and interaction events
CREATE MATERIALIZED VIEW IF NOT EXISTS trace_rollup_mv
TO trace_rollup
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  ifNull(external_subscriber_id, '') AS external_subscriber_id,
  event_type,
  ifNull(provider_id, '') AS provider_id,
  1 AS count
FROM traces
WHERE event_type IN ('message_sent', 'message_seen', 'message_read', 'message_snoozed', 'message_archived');
