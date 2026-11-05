import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { MetricsService } from '../../metrics/metrics.service';
import { StepRunV2Repository } from './step-run-v2.repository';
import {
  STEP_RUNS_V2_DROPPED_METRIC,
  STEP_RUNS_V2_INSERT_ERROR_METRIC,
  STEP_RUNS_V2_MAX_PENDING_ROWS,
  StepRunV2Writer,
} from './step-run-v2.writer';

function buildJob(overrides: Partial<JobEntity> = {}): JobEntity {
  return {
    _id: 'job-1',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _notificationId: 'notification-1',
    status: JobStatusEnum.QUEUED,
    type: StepTypeEnum.EMAIL,
    createdAt: '2026-11-03T09:59:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    step: { _id: 'step-1', _templateId: 'message-template-1', stepId: 'email-step', name: 'Email' },
    ...overrides,
  } as JobEntity;
}

function buildWriter({ configured = true, enabled = true } = {}) {
  const repository = {
    isConfigured: vi.fn().mockReturnValue(configured),
    insertMany: vi.fn().mockResolvedValue(undefined),
  };
  const jobRepository = { find: vi.fn().mockResolvedValue([]) };
  const featureFlagsService = { getFlag: vi.fn().mockResolvedValue(enabled) };
  const logger = { setContext: vi.fn(), error: vi.fn(), warn: vi.fn() };
  const metricsService = { recordMetric: vi.fn() };
  const writer = new StepRunV2Writer(
    repository as unknown as StepRunV2Repository,
    jobRepository as unknown as JobRepository,
    featureFlagsService as unknown as FeatureFlagsService,
    logger as unknown as PinoLogger,
    metricsService as unknown as MetricsService
  );

  return { writer, repository, jobRepository, featureFlagsService, logger, metricsService };
}

describe('StepRunV2Writer', () => {
  it('does nothing when ClickHouse is not configured', async () => {
    const { writer, repository, jobRepository, featureFlagsService } = buildWriter({ configured: false });

    writer.write(buildJob());
    writer.writeByIds({ environmentId: 'env-1', organizationId: 'org-1', jobIds: ['job-1'] });
    await new Promise((resolve) => setImmediate(resolve));

    expect(featureFlagsService.getFlag).not.toHaveBeenCalled();
    expect(jobRepository.find).not.toHaveBeenCalled();
    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('does nothing when the flag is off for the environment', async () => {
    const { writer, repository, jobRepository, featureFlagsService } = buildWriter({ enabled: false });

    writer.write(buildJob());
    writer.writeByIds({ environmentId: 'env-1', organizationId: 'org-1', jobIds: ['job-1'] });

    await vi.waitFor(() => expect(featureFlagsService.getFlag).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setImmediate(resolve));
    expect(featureFlagsService.getFlag).toHaveBeenCalledWith({
      key: FeatureFlagsKeysEnum.IS_STEP_RUNS_V2_WRITE_ENABLED,
      organization: { _id: 'org-1' },
      environment: { _id: 'env-1' },
      defaultValue: false,
    });
    expect(jobRepository.find).not.toHaveBeenCalled();
    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('writes the status and version of the document it is given', async () => {
    const { writer, repository } = buildWriter();

    writer.write(buildJob({ status: JobStatusEnum.RUNNING, updatedAt: '2026-11-03T10:00:01.000Z' }));

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalled());
    const [rows] = repository.insertMany.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      step_run_id: 'job-1',
      status: 'running',
      version: Date.parse('2026-11-03T10:00:01.000Z'),
    });
  });

  it('returns before the insert finishes', async () => {
    const { writer, repository } = buildWriter();
    let resolveInsert: () => void = () => undefined;
    repository.insertMany.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInsert = resolve;
      })
    );

    const result = writer.write(buildJob());

    expect(result).toBeUndefined();
    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalled());
    resolveInsert();
  });

  it('writes trigger jobs and skips missing jobs', async () => {
    const { writer, repository } = buildWriter();

    writer.writeMany([buildJob({ _id: 'trigger', type: StepTypeEnum.TRIGGER }), null, buildJob({ _id: 'job-2' })]);

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalled());
    const [rows] = repository.insertMany.mock.calls[0];
    expect(rows.map((row: { step_run_id: string }) => row.step_run_id)).toEqual(['trigger', 'job-2']);
  });

  it('checks the flag and inserts separately per environment', async () => {
    const { writer, repository, featureFlagsService } = buildWriter();

    writer.writeMany([
      buildJob({ _id: 'job-1', _environmentId: 'env-1' }),
      buildJob({ _id: 'job-2', _environmentId: 'env-2' }),
    ]);

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalledTimes(2));
    expect(featureFlagsService.getFlag).toHaveBeenCalledTimes(2);
  });

  it('re-reads jobs by id and writes their current Mongo state', async () => {
    const { writer, repository, jobRepository } = buildWriter();
    jobRepository.find.mockResolvedValue([
      buildJob({ _id: 'job-1', status: JobStatusEnum.CANCELED, updatedAt: '2026-11-03T10:00:02.000Z' }),
    ]);

    writer.writeByIds({ environmentId: 'env-1', organizationId: 'org-1', jobIds: ['job-1'] });

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalled());
    expect(jobRepository.find.mock.calls[0][0]).toEqual({ _environmentId: 'env-1', _id: { $in: ['job-1'] } });
    const [rows] = repository.insertMany.mock.calls[0];
    expect(rows[0]).toMatchObject({ step_run_id: 'job-1', status: 'canceled' });
  });

  it('versions a late cancel below a completion Mongo applied after it', async () => {
    const { writer, repository, jobRepository } = buildWriter();
    const completed = buildJob({ status: JobStatusEnum.COMPLETED, updatedAt: '2026-11-03T10:00:03.000Z' });
    jobRepository.find.mockResolvedValue([
      buildJob({ status: JobStatusEnum.CANCELED, updatedAt: '2026-11-03T10:00:02.000Z' }),
    ]);

    writer.write(completed);
    writer.writeByIds({ environmentId: 'env-1', organizationId: 'org-1', jobIds: ['job-1'] });

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalledTimes(2));
    const versions = Object.fromEntries(
      repository.insertMany.mock.calls.map(([rows]) => [rows[0].status, rows[0].version])
    );
    expect(versions.completed).toBeGreaterThan(versions.canceled);
  });

  it('drops rows and records a metric once too many writes are pending', async () => {
    const { writer, repository, metricsService, logger } = buildWriter();
    repository.insertMany.mockReturnValue(new Promise<void>(() => undefined));
    const pendingJobs = Array.from({ length: STEP_RUNS_V2_MAX_PENDING_ROWS }, (_, index) =>
      buildJob({ _id: `job-${index}` })
    );

    writer.writeMany(pendingJobs);
    writer.write(buildJob({ _id: 'overflow' }));

    expect(metricsService.recordMetric).toHaveBeenCalledWith(STEP_RUNS_V2_DROPPED_METRIC, 1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalledTimes(1));
  });

  it('accepts new rows again once pending writes settle', async () => {
    const { writer, repository, metricsService } = buildWriter();
    let resolveInsert: () => void = () => undefined;
    repository.insertMany.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveInsert = resolve;
      })
    );

    writer.writeMany(
      Array.from({ length: STEP_RUNS_V2_MAX_PENDING_ROWS }, (_, index) => buildJob({ _id: `job-${index}` }))
    );
    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalledTimes(1));
    resolveInsert();
    await new Promise((resolve) => setImmediate(resolve));

    writer.write(buildJob({ _id: 'after' }));

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalledTimes(2));
    expect(metricsService.recordMetric).not.toHaveBeenCalledWith(STEP_RUNS_V2_DROPPED_METRIC, expect.anything());
  });

  it('logs the row ids and records a metric when the insert fails, without throwing', async () => {
    const { writer, repository, logger, metricsService } = buildWriter();
    repository.insertMany.mockRejectedValue(new Error('ClickHouse down'));

    expect(() => writer.write(buildJob())).not.toThrow();

    await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
    expect(metricsService.recordMetric).toHaveBeenCalledWith(STEP_RUNS_V2_INSERT_ERROR_METRIC, 1);
    expect(logger.error.mock.calls[0][0]).toMatchObject({ stepRunIds: ['job-1'] });
  });
});
