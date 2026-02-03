-- Finalize table migration by exchanging old and new tables and recreating materialized views
-- This migration completes the schema refactoring started in migration 4
-- PREREQUISITE: All backfilling must be completed for traces_temp and delivery_trend_counts_temp

-- =============================================================================
-- Step 1: Exchange tables atomically (CRITICAL: Do this FIRST)
-- After exchange, the main tables will have the new optimized schemas
-- New inserts will immediately go to the new schema tables
-- =============================================================================

-- Exchange traces with traces_temp (swaps data and schema)
-- After: traces has new ORDER BY, traces_temp has old data
EXCHANGE TABLES traces AND traces_temp;

-- Exchange delivery_trend_counts with delivery_trend_counts_temp
-- After: delivery_trend_counts has TTL support, delivery_trend_counts_temp has old data
EXCHANGE TABLES delivery_trend_counts AND delivery_trend_counts_temp;

-- =============================================================================
-- Step 2: Drop temporary migration materialized views immediately
-- These MVs may error on schema mismatch after exchange, but that's acceptable
-- The exchange happened first, so new data goes to the correct tables
-- =============================================================================

DROP VIEW IF EXISTS traces_to_traces_temp_mv;

DROP VIEW IF EXISTS delivery_trend_counts_temp_mv;

DROP VIEW IF EXISTS workflow_run_count_temp_mv;

-- =============================================================================
-- Step 3: Drop old materialized views that will be recreated
-- delivery_trend_counts_mv needs to be recreated to change source from step_runs to traces
-- =============================================================================

DROP VIEW IF EXISTS delivery_trend_counts_mv;

-- Note: trace_rollup_mv is NOT recreated as it continues to work with the new schema
-- Note: workflow_run_count was created directly with its final name in migration 4

-- =============================================================================
-- Step 4: Create new permanent materialized views
-- =============================================================================

-- Materialized view: delivery_trend_counts_mv
-- Aggregates message delivery counts by channel type for delivery trend analytics
-- Source: traces table (now with new schema, previously used step_runs)
CREATE MATERIALIZED VIEW IF NOT EXISTS delivery_trend_counts_mv
TO delivery_trend_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  ifNull(workflow_id, '') AS workflow_id,
  step_run_type AS step_type,
  1 AS count,
  toDate(expires_at) AS expires_at
FROM traces
WHERE
  event_type = 'message_sent'
  AND step_run_type IN ('in_app', 'email', 'sms', 'chat', 'push');

-- Materialized view: workflow_run_count_mv
-- Aggregates event counts by workflow run identifier for workflow analytics
-- Source: traces table (now with new schema)
-- IMPORTANT: Uses entity_type filter to match temp MV behavior from migration 4
CREATE MATERIALIZED VIEW IF NOT EXISTS workflow_run_count_mv
TO workflow_run_count
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  event_type,
  workflow_run_identifier AS workflow_run_id,
  1 AS count,
  toDate(expires_at) AS expires_at
FROM traces
WHERE entity_type = 'workflow_run';

-- =============================================================================
-- Step 5: Drop old tables (cleanup)
-- After exchange, these tables contain the old data and are no longer needed
-- =============================================================================

-- We keep traces_temp table for historical data storage and do not drop it.
-- DROP TABLE IF EXISTS traces_temp;

DROP TABLE IF EXISTS delivery_trend_counts_temp;
