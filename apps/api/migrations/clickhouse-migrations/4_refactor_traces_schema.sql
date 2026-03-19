-- Refactor traces table ORDER BY for better query performance
-- Changes ORDER BY from (entity_type, organization_id, entity_id, created_at)
-- to (organization_id, environment_id, entity_type, toDate(created_at), entity_id)
-- This migration creates a new table with the desired schema and a materialized view
-- to populate it from the existing traces table

-- Step 0: Add workflow run columns to the original traces table
-- These columns must be added before creating the MV so data flows correctly
ALTER TABLE traces ADD COLUMN IF NOT EXISTS workflow_name String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS transaction_id String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS channels String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS subscriber_to String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS payload String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS control_values String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS topics String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS is_digest Bool DEFAULT false;
ALTER TABLE traces ADD COLUMN IF NOT EXISTS digested_workflow_run_id String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS delivery_lifecycle_status String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS delivery_lifecycle_detail String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS severity String DEFAULT '';
ALTER TABLE traces ADD COLUMN IF NOT EXISTS critical Bool DEFAULT false;
ALTER TABLE traces ADD COLUMN IF NOT EXISTS context_keys Array(String) DEFAULT [];

-- Step 1: Create traces_temp table with refactored ORDER BY
CREATE TABLE IF NOT EXISTS traces_temp (
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
    
    -- Workflow run columns (14 new columns)
    workflow_name String DEFAULT '',
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
    critical Bool DEFAULT false,
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

-- Step 2: Create materialized view to populate traces_temp from new inserts into traces
-- Only captures records created after migration deployment
-- Historical data will be backfilled separately via INSERT SELECT
CREATE MATERIALIZED VIEW IF NOT EXISTS traces_to_traces_temp_mv
TO traces_temp
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
    coalesce(provider_id, '') AS provider_id,
    workflow_name,
    transaction_id,
    channels,
    subscriber_to,
    payload,
    control_values,
    topics,
    is_digest,
    digested_workflow_run_id,
    delivery_lifecycle_status,
    delivery_lifecycle_detail,
    severity,
    critical,
    context_keys
FROM traces
WHERE created_at > toDateTime64('2026-02-03 00:00:00', 3, 'UTC');

-- Step 3: Create delivery_trend_counts_temp table for migration from step_runs to traces
-- Similar to traces_temp, this allows backfilling historical data separately
CREATE TABLE IF NOT EXISTS delivery_trend_counts_temp (
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String DEFAULT '',
  step_type LowCardinality(String),
  count UInt64,
  expires_at Date
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, date, workflow_id, step_type)
TTL expires_at;

-- Step 4: Create materialized view to populate delivery_trend_counts_temp from traces_temp
-- Historical data will be backfilled separately via INSERT SELECT
CREATE MATERIALIZED VIEW IF NOT EXISTS delivery_trend_counts_temp_mv
TO delivery_trend_counts_temp
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  step_run_type AS step_type,
  1 AS count,
  toDate(expires_at) AS expires_at
FROM traces_temp
WHERE 
  event_type = 'message_sent'
  AND step_run_type IN ('in_app', 'email', 'sms', 'chat', 'push');

-- Step 5: Create workflow_run_count table for workflow run event aggregation
-- Aggregates event counts by workflow run identifier for analytics
CREATE TABLE IF NOT EXISTS workflow_run_count (
  date Date,
  organization_id String,
  environment_id String,
  event_type LowCardinality(String),
  workflow_run_id String,
  count UInt64,
  expires_at Date
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, event_type, date, workflow_run_id)
TTL expires_at;

-- Step 6: Create temporary materialized view to populate workflow_run_count from traces_temp
-- Historical data will be backfilled separately via INSERT SELECT
-- This MV will be dropped and replaced with a permanent one in migration 5
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_run_count_temp_mv
TO workflow_run_count
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  event_type,
  workflow_run_identifier AS workflow_run_id,
  1 AS count,
  toDate(expires_at) AS expires_at
FROM traces_temp
WHERE entity_type = 'workflow_run'
