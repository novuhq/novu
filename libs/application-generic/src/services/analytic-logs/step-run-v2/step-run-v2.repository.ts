import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { ClickHouseBatchService } from '../clickhouse-batch.service';
import { getInsertOptions } from '../shared';
import { STEP_RUNS_V2_DDL, StepRunV2ReadRow, StepRunV2Row, TABLE_NAME } from './step-run-v2.schema';

export const STEP_RUNS_V2_MAX_READ_LIMIT = 1000;

const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_FLUSH_INTERVAL_MS = 1000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : fallback;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const FIND_BY_WORKFLOW_RUN_IDS_QUERY = `
SELECT workflow_run_id, step_run_id, step_id, step_identifier, step_name, step_type, status,
       provider_id, wait_amount, wait_unit, wait_type, wait_until, digest_metadata, digest_events_count,
       schedule_extensions_count, created_at, updated_at
FROM ${TABLE_NAME}
WHERE environment_id = {environmentId:String}
  AND workflow_run_id IN {workflowRunIds:Array(String)}
  AND created_at >= {oldestRunCreatedAt:DateTime64(3, 'UTC')}
ORDER BY step_run_id, version DESC
LIMIT 1 BY step_run_id
LIMIT {limit:UInt32} OFFSET {offset:UInt32}
SETTINGS max_execution_time = 10, max_rows_to_read = 10000000
`;

export type FindStepRunsV2ByWorkflowRunIdsParams = {
  environmentId: string;
  workflowRunIds: string[];
  oldestRunCreatedAt: Date;
  limit: number;
  /** Rows to skip, for paging through runs with more step rows than one read returns. */
  offset?: number;
};

@Injectable()
export class StepRunV2Repository implements OnModuleInit {
  /**
   * Async insert without waiting for the server-side flush (sync and waiting under test), like the other log
   * tables. Waiting held one of the process's ClickHouse connections open for every job status change.
   */
  private readonly insertOptions: InsertOptions = getInsertOptions(
    process.env.STEP_RUNS_V2_ASYNC_INSERT,
    process.env.STEP_RUNS_V2_WAIT_ASYNC_INSERT
  );

  private readonly batchConfig = {
    maxBatchSize: readPositiveInt(process.env.STEP_RUNS_V2_BATCH_SIZE, DEFAULT_BATCH_SIZE),
    flushIntervalMs: readPositiveInt(process.env.STEP_RUNS_V2_FLUSH_INTERVAL_MS, DEFAULT_FLUSH_INTERVAL_MS),
    insertOptions: this.insertOptions,
  };

  constructor(
    private readonly clickhouseService: ClickHouseService,
    private readonly logger: PinoLogger,
    @Optional() private readonly batchService?: ClickHouseBatchService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'test') {
      return;
    }

    try {
      await this.clickhouseService.exec({ query: STEP_RUNS_V2_DDL });
    } catch (error) {
      this.logger.error({ err: error }, `Failed to create ClickHouse table ${TABLE_NAME}`);
    }
  }

  isConfigured(): boolean {
    return Boolean(this.clickhouseService.client);
  }

  /**
   * Where the batch service is provided (the worker), rows are buffered in the process and flushed as one insert
   * per batch, so a job status change costs no ClickHouse request of its own. Rows reach ClickHouse up to
   * `flushIntervalMs` later; order within and across batches does not matter because the highest `version` wins.
   * Tests insert directly so a read right after a write sees the row.
   */
  async insertMany(rows: StepRunV2Row[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    if (this.batchService && process.env.NODE_ENV !== 'test') {
      await Promise.all(rows.map((row) => this.batchService?.add(TABLE_NAME, row, this.batchConfig)));

      return;
    }

    await this.clickhouseService.insert(TABLE_NAME, rows, this.insertOptions);
  }

  async findByWorkflowRunIds({
    environmentId,
    workflowRunIds,
    oldestRunCreatedAt,
    limit,
    offset = 0,
  }: FindStepRunsV2ByWorkflowRunIdsParams): Promise<StepRunV2ReadRow[]> {
    if (!environmentId) {
      throw new Error('environmentId is required');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > STEP_RUNS_V2_MAX_READ_LIMIT) {
      throw new Error(`Limit must be an integer between 1 and ${STEP_RUNS_V2_MAX_READ_LIMIT}`);
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error('Offset must be a non-negative integer');
    }

    if (workflowRunIds.length === 0) {
      return [];
    }

    const result = await this.clickhouseService.query<StepRunV2ReadRow>({
      query: FIND_BY_WORKFLOW_RUN_IDS_QUERY,
      params: {
        environmentId,
        workflowRunIds,
        oldestRunCreatedAt,
        limit,
        offset,
      },
    });

    return result.data;
  }
}
