-- step_runs_v2: one row per job status change, latest row per step wins.
-- Ticket: NV-9311
CREATE TABLE IF NOT EXISTS step_runs_v2
(
  environment_id            String,
  workflow_run_id           String,
  step_run_id               String,
  step_id                   String DEFAULT '',
  step_identifier           String DEFAULT '',
  step_name                 String DEFAULT '',
  step_type                 LowCardinality(String),
  status                    LowCardinality(String),
  provider_id               LowCardinality(String) DEFAULT '',
  wait_amount               UInt32 DEFAULT 0,
  wait_unit                 LowCardinality(String) DEFAULT '',
  wait_until                DateTime64(3, 'UTC') DEFAULT 0,
  digest_events_count       UInt32 DEFAULT 0,
  schedule_extensions_count UInt16 DEFAULT 0,
  created_at                DateTime64(3, 'UTC') CODEC(Delta, ZSTD(1)),
  updated_at                DateTime64(3, 'UTC') CODEC(Delta, ZSTD(1)),
  version                   UInt64 CODEC(Delta, ZSTD(1))
)
ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(created_at)
ORDER BY (environment_id, workflow_run_id, step_run_id)
TTL toDateTime(created_at) + INTERVAL 180 DAY
SETTINGS ttl_only_drop_parts = 1;
