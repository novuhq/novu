-- Refactor traces table ORDER BY for better query performance
-- Changes ORDER BY from (entity_type, organization_id, entity_id, created_at)
-- to (organization_id, environment_id, entity_type, toDate(created_at), entity_id)
-- This migration creates a new table with the desired schema and a materialized view
-- to populate it from the existing traces table

-- Step 1: Create traces_new table with refactored ORDER BY
CREATE TABLE IF NOT EXISTS traces_new (
    -- Core fields
    id String,
    created_at DateTime64(3, 'UTC'),
    organization_id String,
    environment_id String,
    
    -- Context (optimized - removed Nullable)
    user_id String DEFAULT '',
    external_subscriber_id String DEFAULT '',
    subscriber_id String DEFAULT '',
    
    -- Trace metadata
    event_type LowCardinality(String),
    title String,
    message String DEFAULT '',
    raw_data String DEFAULT '',
    status LowCardinality(String),
    
    -- Correlation
    entity_type LowCardinality(String),
    entity_id String,
    
    -- Data retention
    expires_at DateTime64(3, 'UTC'),
    
    -- Existing metadata
    step_run_type LowCardinality(String) DEFAULT '',
    workflow_run_identifier String DEFAULT '',
    workflow_id String DEFAULT '',
    provider_id LowCardinality(String) DEFAULT '',
    
    -- Workflow run columns (15 new columns)
    workflow_name String DEFAULT '',
    trigger_identifier String DEFAULT '',
    transaction_id String DEFAULT '',
    channels String DEFAULT '',
    subscriber_to String DEFAULT '',
    payload String DEFAULT '',
    control_values String DEFAULT '',
    topics String DEFAULT '',
    is_digest Bool DEFAULT false,
    digested_workflow_run_id String DEFAULT '',
    delivery_lifecycle_status LowCardinality(String) DEFAULT '',
    delivery_lifecycle_detail LowCardinality(String) DEFAULT '',
    severity LowCardinality(String) DEFAULT '',
    critical UInt8 DEFAULT 0,
    context_keys Array(String) DEFAULT [],
    
    INDEX idx_event_type event_type TYPE set(50) GRANULARITY 4,
    INDEX idx_workflow_id workflow_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_transaction_id transaction_id TYPE bloom_filter GRANULARITY 4
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (organization_id, environment_id, entity_type, toDate(created_at), entity_id)
TTL toDateTime(expires_at)
SETTINGS index_granularity = 8192, async_insert = 1;

-- Step 2: Create materialized view to populate traces_new from new inserts into traces
-- Only captures records created after migration deployment
-- Historical data will be backfilled separately via INSERT SELECT
CREATE MATERIALIZED VIEW IF NOT EXISTS traces_to_traces_new_mv
TO traces_new
AS SELECT
    id,
    created_at,
    organization_id,
    environment_id,
    coalesce(user_id, '') AS user_id,
    coalesce(external_subscriber_id, '') AS external_subscriber_id,
    coalesce(subscriber_id, '') AS subscriber_id,
    event_type,
    title,
    coalesce(message, '') AS message,
    coalesce(raw_data, '') AS raw_data,
    status,
    entity_type,
    entity_id,
    expires_at,
    step_run_type,
    workflow_run_identifier,
    workflow_id,
    provider_id,
    '' AS workflow_name,
    '' AS trigger_identifier,
    '' AS transaction_id,
    '' AS channels,
    '' AS subscriber_to,
    '' AS payload,
    '' AS control_values,
    '' AS topics,
    false AS is_digest,
    '' AS digested_workflow_run_id,
    '' AS delivery_lifecycle_status,
    '' AS delivery_lifecycle_detail,
    '' AS severity,
    0 AS critical,
    [] AS context_keys
FROM traces
WHERE created_at > toDateTime64('2026-01-26 00:00:00', 3, 'UTC');

-- Step 3: Create delivery_trend_counts_new table for migration from step_runs to traces
-- Similar to traces_new, this allows backfilling historical data separately
CREATE TABLE IF NOT EXISTS delivery_trend_counts_new (
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

-- Step 4: Create materialized view to populate delivery_trend_counts_new from traces
-- Only captures records created after migration deployment
-- Historical data will be backfilled separately via INSERT SELECT
CREATE MATERIALIZED VIEW IF NOT EXISTS delivery_trend_counts_new_mv
TO delivery_trend_counts_new
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  step_run_type AS step_type,
  1 AS count
FROM traces
WHERE 
  event_type = 'message_sent'
  AND step_run_type IN ('in_app', 'email', 'sms', 'chat', 'push')
  AND created_at > toDateTime64('2026-01-26 00:00:00', 3, 'UTC');

-- Step 5: Create workflow_run_count_new table for workflow run event aggregation
-- Aggregates event counts by workflow run identifier for analytics
CREATE TABLE IF NOT EXISTS workflow_run_count_new (
  date Date,
  organization_id String,
  environment_id String,
  event_type LowCardinality(String),
  workflow_run_id String,
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, date, event_type, workflow_run_id);

-- Step 6: Create materialized view to populate workflow_run_count_new from traces
-- Only captures records created after migration deployment
-- Historical data will be backfilled separately via INSERT SELECT
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_run_count_new_mv
TO workflow_run_count_new
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  event_type,
  workflow_run_identifier AS workflow_run_id,
  1 AS count
FROM traces
WHERE created_at > toDateTime64('2026-01-26 00:00:00', 3, 'UTC');
