-- Initial ClickHouse schema for Novu analytics tables
-- This migration creates all tables used by the analytic-logs service

-- Step Runs Table
-- Tracks individual step executions within workflow runs
-- Uses ReplacingMergeTree to allow updates via updated_at
CREATE TABLE IF NOT EXISTS step_runs (
  id String,
  created_at DateTime64(3, 'UTC'),
  updated_at DateTime64(3, 'UTC'),
  step_run_id String,
  step_id String,
  workflow_run_id Nullable(String) DEFAULT NULL,
  organization_id String,
  environment_id String,
  user_id String,
  subscriber_id String,
  external_subscriber_id Nullable(String),
  message_id Nullable(String),
  context_keys Array(String) DEFAULT [],
  step_type LowCardinality(String),
  step_name String,
  provider_id Nullable(String),
  status LowCardinality(String),
  digest Nullable(String) DEFAULT NULL,
  deferred_ms Nullable(UInt32),
  error_code Nullable(String),
  error_message Nullable(String),
  transaction_id String,
  expires_at DateTime64(3, 'UTC'),
  schedule_extensions_count UInt8 DEFAULT 0
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(created_at)
ORDER BY (organization_id, step_run_id)
TTL toDateTime(expires_at);

-- Traces Table
-- Stores event traces for debugging and monitoring workflow/step execution
CREATE TABLE IF NOT EXISTS traces (
  id String,
  created_at DateTime64(3, 'UTC'),
  organization_id String,
  environment_id String,
  user_id Nullable(String),
  external_subscriber_id Nullable(String),
  subscriber_id Nullable(String),
  event_type LowCardinality(String),
  title String,
  message Nullable(String),
  raw_data Nullable(String),
  status LowCardinality(String),
  entity_type LowCardinality(String),
  entity_id String,
  expires_at DateTime64(3, 'UTC'),
  step_run_type String DEFAULT '',
  workflow_run_identifier String DEFAULT ''
)
ENGINE = MergeTree
ORDER BY (entity_type, organization_id, entity_id, created_at)
SETTINGS async_insert = 1;

-- Requests Table
-- Logs HTTP requests for analytics and debugging
CREATE TABLE IF NOT EXISTS requests (
  id String,
  created_at DateTime64(3, 'UTC'),
  path String,
  url String,
  url_pattern String,
  hostname String,
  status_code UInt16,
  method LowCardinality(String),
  transaction_id String,
  ip String,
  user_agent String,
  request_body String,
  response_body String,
  user_id String,
  organization_id String,
  environment_id String,
  auth_type String,
  duration_ms UInt32,
  expires_at DateTime64(3, 'UTC')
)
ENGINE = MergeTree
ORDER BY (organization_id, environment_id, transaction_id, created_at)
SETTINGS async_insert = 0;

-- Workflow Runs Table
-- Tracks complete workflow execution instances
-- Uses ReplacingMergeTree to allow updates via updated_at
CREATE TABLE IF NOT EXISTS workflow_runs (
  id String,
  created_at DateTime64(3, 'UTC'),
  updated_at DateTime64(3, 'UTC'),
  workflow_run_id String,
  workflow_id String,
  workflow_name String,
  organization_id String,
  environment_id String,
  user_id Nullable(String),
  subscriber_id String,
  external_subscriber_id Nullable(String),
  status LowCardinality(String),
  trigger_identifier String,
  transaction_id String,
  channels String,
  subscriber_to Nullable(String),
  payload Nullable(String),
  control_values Nullable(String),
  topics Nullable(String),
  is_digest LowCardinality(String),
  digested_workflow_run_id Nullable(String),
  expires_at DateTime64(3, 'UTC'),
  delivery_lifecycle_status String DEFAULT '',
  delivery_lifecycle_detail String DEFAULT '',
  severity LowCardinality(String) DEFAULT 'none',
  critical Bool DEFAULT false,
  context_keys Array(String) DEFAULT []
)
ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(created_at)
ORDER BY (organization_id, workflow_run_id)
TTL toDateTime(expires_at);
