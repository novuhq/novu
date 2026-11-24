import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PinoLogger } from 'nestjs-pino';
import { ClickHouseService } from '../clickhouse.service';
import { ClickHouseBatchService } from '../clickhouse-batch.service';
import { FIND_BY_WORKFLOW_RUN_IDS_QUERY, StepRunV2Repository } from './step-run-v2.repository';
import { STEP_RUNS_V2_DDL, StepRunV2Row } from './step-run-v2.schema';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../../../../apps/api/migrations/clickhouse-migrations/7_create_step_runs_v2.sql'
);

function normalizeSql(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildRepository({ withBatchService = false } = {}) {
  const batchService = { add: vi.fn().mockResolvedValue(undefined) };
  const clickhouseService = {
    client: {},
    insert: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ data: [], rows: 0 }),
    exec: vi.fn().mockResolvedValue(undefined),
  };
  const logger = { setContext: vi.fn(), error: vi.fn() };
  const repository = new StepRunV2Repository(
    clickhouseService as unknown as ClickHouseService,
    logger as unknown as PinoLogger,
    withBatchService ? (batchService as unknown as ClickHouseBatchService) : undefined
  );

  return { repository, clickhouseService, batchService };
}

describe('StepRunV2Repository', () => {
  it('keeps the DDL constant identical to the migration file', () => {
    const migration = readFileSync(MIGRATION_PATH, 'utf8');

    expect(normalizeSql(STEP_RUNS_V2_DDL)).toBe(normalizeSql(migration));
  });

  describe('insertMany', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('inserts directly without waiting for the flush when no batch service is provided', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { repository, clickhouseService } = buildRepository();
      const rows = [{ step_run_id: 'job-1' } as StepRunV2Row];

      await repository.insertMany(rows);

      expect(clickhouseService.insert).toHaveBeenCalledTimes(1);
      expect(clickhouseService.insert).toHaveBeenCalledWith('step_runs_v2', rows, {
        asyncInsert: true,
        waitForAsyncInsert: false,
      });
    });

    it('buffers each row in the batch service instead of inserting', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const { repository, clickhouseService, batchService } = buildRepository({ withBatchService: true });
      const rows = [{ step_run_id: 'job-1' }, { step_run_id: 'job-2' }] as StepRunV2Row[];

      await repository.insertMany(rows);

      const batchConfig = {
        maxBatchSize: 1000,
        flushIntervalMs: 1000,
        insertOptions: { asyncInsert: true, waitForAsyncInsert: false },
      };
      expect(clickhouseService.insert).not.toHaveBeenCalled();
      expect(batchService.add.mock.calls).toEqual([
        ['step_runs_v2', rows[0], batchConfig],
        ['step_runs_v2', rows[1], batchConfig],
      ]);
    });

    it('reads batch size, flush interval and insert options from the environment', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('STEP_RUNS_V2_BATCH_SIZE', '250');
      vi.stubEnv('STEP_RUNS_V2_FLUSH_INTERVAL_MS', '5000');
      vi.stubEnv('STEP_RUNS_V2_WAIT_ASYNC_INSERT', 'true');
      const { repository, batchService } = buildRepository({ withBatchService: true });

      await repository.insertMany([{ step_run_id: 'job-1' } as StepRunV2Row]);

      expect(batchService.add.mock.calls[0][2]).toEqual({
        maxBatchSize: 250,
        flushIntervalMs: 5000,
        insertOptions: { asyncInsert: true, waitForAsyncInsert: true },
      });
    });

    it('inserts synchronously under test even with a batch service, so reads see the row at once', async () => {
      vi.stubEnv('NODE_ENV', 'test');
      const { repository, clickhouseService, batchService } = buildRepository({ withBatchService: true });
      const rows = [{ step_run_id: 'job-1' } as StepRunV2Row];

      await repository.insertMany(rows);

      expect(batchService.add).not.toHaveBeenCalled();
      expect(clickhouseService.insert).toHaveBeenCalledWith('step_runs_v2', rows, {
        asyncInsert: false,
        waitForAsyncInsert: true,
      });
    });

    it('skips empty batches', async () => {
      const { repository, clickhouseService } = buildRepository();

      await repository.insertMany([]);

      expect(clickhouseService.insert).not.toHaveBeenCalled();
    });
  });

  describe('findByWorkflowRunIds', () => {
    const oldestRunCreatedAt = new Date('2026-11-01T00:00:00.000Z');

    it('runs the latest-row-per-step query with the environment filter', async () => {
      const { repository, clickhouseService } = buildRepository();

      await repository.findByWorkflowRunIds({
        environmentId: 'env-1',
        workflowRunIds: ['run-1', 'run-2'],
        oldestRunCreatedAt,
        limit: 500,
      });

      expect(clickhouseService.query).toHaveBeenCalledWith({
        query: FIND_BY_WORKFLOW_RUN_IDS_QUERY,
        params: {
          environmentId: 'env-1',
          workflowRunIds: ['run-1', 'run-2'],
          oldestRunCreatedAt,
          limit: 500,
          offset: 0,
        },
      });
      expect(FIND_BY_WORKFLOW_RUN_IDS_QUERY).toContain('environment_id = {environmentId:String}');
      expect(FIND_BY_WORKFLOW_RUN_IDS_QUERY).toContain('ORDER BY step_run_id, version DESC');
      expect(FIND_BY_WORKFLOW_RUN_IDS_QUERY).toContain('LIMIT 1 BY step_run_id');
      expect(FIND_BY_WORKFLOW_RUN_IDS_QUERY).toContain('OFFSET {offset:UInt32}');
    });

    it.each([-1, 1.5])('rejects offset %s', async (offset) => {
      const { repository, clickhouseService } = buildRepository();

      await expect(
        repository.findByWorkflowRunIds({
          environmentId: 'env-1',
          workflowRunIds: ['run-1'],
          oldestRunCreatedAt,
          limit: 10,
          offset,
        })
      ).rejects.toThrow('Offset must be a non-negative integer');
      expect(clickhouseService.query).not.toHaveBeenCalled();
    });

    it.each([0, 1001, 1.5])('rejects limit %s', async (limit) => {
      const { repository, clickhouseService } = buildRepository();

      await expect(
        repository.findByWorkflowRunIds({
          environmentId: 'env-1',
          workflowRunIds: ['run-1'],
          oldestRunCreatedAt,
          limit,
        })
      ).rejects.toThrow('Limit must be an integer between 1 and 1000');
      expect(clickhouseService.query).not.toHaveBeenCalled();
    });

    it('requires an environment id', async () => {
      const { repository } = buildRepository();

      await expect(
        repository.findByWorkflowRunIds({ environmentId: '', workflowRunIds: ['run-1'], oldestRunCreatedAt, limit: 10 })
      ).rejects.toThrow('environmentId is required');
    });

    it('returns no rows without querying when no run ids are given', async () => {
      const { repository, clickhouseService } = buildRepository();

      await expect(
        repository.findByWorkflowRunIds({ environmentId: 'env-1', workflowRunIds: [], oldestRunCreatedAt, limit: 10 })
      ).resolves.toEqual([]);
      expect(clickhouseService.query).not.toHaveBeenCalled();
    });
  });
});
