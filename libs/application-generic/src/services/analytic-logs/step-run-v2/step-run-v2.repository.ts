import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { STEP_RUNS_V2_DDL, StepRunV2ReadRow, StepRunV2Row, TABLE_NAME } from './step-run-v2.schema';

export const STEP_RUNS_V2_MAX_READ_LIMIT = 1000;

const STEP_RUNS_V2_INSERT_OPTIONS: InsertOptions = {
  asyncInsert: true,
  waitForAsyncInsert: true,
};

export const FIND_BY_WORKFLOW_RUN_IDS_QUERY = `
SELECT workflow_run_id, step_run_id, step_id, step_identifier, step_name, step_type, status,
       provider_id, wait_amount, wait_unit, wait_until, digest_events_count,
       schedule_extensions_count, created_at, updated_at
FROM ${TABLE_NAME}
WHERE environment_id = {environmentId:String}
  AND workflow_run_id IN {workflowRunIds:Array(String)}
  AND created_at >= {oldestRunCreatedAt:DateTime64(3, 'UTC')}
ORDER BY step_run_id, version DESC
LIMIT 1 BY step_run_id
LIMIT {limit:UInt32}
SETTINGS max_execution_time = 10, max_rows_to_read = 10000000
`;

export type FindStepRunsV2ByWorkflowRunIdsParams = {
  environmentId: string;
  workflowRunIds: string[];
  oldestRunCreatedAt: Date;
  limit: number;
};

@Injectable()
export class StepRunV2Repository implements OnModuleInit {
  constructor(
    private readonly clickhouseService: ClickHouseService,
    private readonly logger: PinoLogger
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

  async insertMany(rows: StepRunV2Row[]): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    await this.clickhouseService.insert(TABLE_NAME, rows, STEP_RUNS_V2_INSERT_OPTIONS);
  }

  async findByWorkflowRunIds({
    environmentId,
    workflowRunIds,
    oldestRunCreatedAt,
    limit,
  }: FindStepRunsV2ByWorkflowRunIdsParams): Promise<StepRunV2ReadRow[]> {
    if (!environmentId) {
      throw new Error('environmentId is required');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > STEP_RUNS_V2_MAX_READ_LIMIT) {
      throw new Error(`Limit must be an integer between 1 and ${STEP_RUNS_V2_MAX_READ_LIMIT}`);
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
      },
    });

    return result.data;
  }
}
