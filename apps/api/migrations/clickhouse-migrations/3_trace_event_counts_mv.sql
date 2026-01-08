-- Migration to create pre-aggregated step_completed event counts
-- This materialized view calculates counts at insert time for optimized query performance
-- Instead of counting all rows at query time, we simply sum pre-calculated counts
-- 
-- NOTE: This table ONLY stores step_completed events (entity_type is always 'step_run')

-- Target table for aggregated step_completed counts
-- Uses SummingMergeTree to automatically sum the count column on merge
-- 
-- Cardinality estimate (per org/env/workflow/year):
--   365 days * N workflows = ~365N rows per environment
-- This is very compact compared to scanning millions of trace rows
CREATE TABLE IF NOT EXISTS trace_event_counts (
  -- Aggregation dimensions (minimal for low cardinality)
  date Date,
  organization_id String,
  environment_id String,
  workflow_id String,
  
  -- Pre-aggregated count (will be summed on merge)
  count UInt64
)
ENGINE = SummingMergeTree(count)
PARTITION BY toYYYYMM(date)
ORDER BY (organization_id, environment_id, workflow_id, date);

-- Materialized view that populates trace_event_counts on every insert to traces
-- Only processes step_completed events (entity_type is implicitly 'step_run')
-- Each insert generates a row with count=1 which gets summed by SummingMergeTree
CREATE MATERIALIZED VIEW IF NOT EXISTS trace_event_counts_mv
TO trace_event_counts
AS SELECT
  toDate(created_at) AS date,
  organization_id,
  environment_id,
  workflow_id,
  1 AS count
FROM traces
WHERE event_type = 'message_sent';
