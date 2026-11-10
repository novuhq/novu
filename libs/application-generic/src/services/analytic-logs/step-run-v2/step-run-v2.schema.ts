import { StepRunFinalStatus, StepRunStatus } from '../step-run/step-run.schema';
import { StepType } from '../types';

export const TABLE_NAME = 'step_runs_v2';

/**
 * Must stay identical to apps/api/migrations/clickhouse-migrations/7_create_step_runs_v2.sql.
 * Local and test runs create the table from this constant; production uses the migration.
 */
export const STEP_RUNS_V2_DDL = `
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
  wait_amount               Float64 DEFAULT 0,
  wait_unit                 LowCardinality(String) DEFAULT '',
  wait_type                 LowCardinality(String) DEFAULT '',
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
`;

export const TERMINAL_VERSION_OFFSET = 10_000_000_000_000;

/**
 * Statuses no later status can replace, so their rows get TERMINAL_VERSION_OFFSET.
 * `merged` is excluded: CancelDelayed promotes a merged digest back to `delayed` and its children to `pending`.
 */
export const STEP_RUN_V2_TERMINAL_STATUSES: readonly StepRunFinalStatus[] = [
  'completed',
  'failed',
  'canceled',
  'skipped',
];

/**
 * DateTime64 columns are written as `YYYY-MM-DDTHH:mm:ss.SSS` strings (see LogRepository.formatDateTime64).
 */
export type StepRunV2Row = {
  environment_id: string;
  workflow_run_id: string;
  step_run_id: string;
  step_id: string;
  step_identifier: string;
  step_name: string;
  step_type: StepType;
  status: StepRunStatus;
  provider_id: string;
  wait_amount: number;
  wait_unit: string;
  /** Digest type (regular, backoff, timed) or delay type (regular, timed, dynamic, scheduled). */
  wait_type: string;
  wait_until: string;
  digest_events_count: number;
  schedule_extensions_count: number;
  created_at: string;
  updated_at: string;
  version: number;
};

export type StepRunV2ReadRow = Omit<StepRunV2Row, 'environment_id' | 'version'>;

export function toClickHouseDateTime64(date: Date): string {
  return date.toISOString().slice(0, -1);
}
