import { JobEntity, JobStatusEnum } from '@novu/dal';
import { FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { MetricsService } from '../../metrics/metrics.service';
import { StepRunV2Repository } from './step-run-v2.repository';
import { STEP_RUNS_V2_INSERT_ERROR_METRIC, StepRunV2Writer } from './step-run-v2.writer';

function buildJob(overrides: Partial<JobEntity> = {}): JobEntity {
  return {
    _id: 'job-1',
    _environmentId: 'env-1',
    _organizationId: 'org-1',
    _notificationId: 'notification-1',
    status: JobStatusEnum.QUEUED,
    type: StepTypeEnum.EMAIL,
    createdAt: '2026-11-03T09:59:00.000Z',
    step: { _id: 'step-1', _templateId: 'message-template-1', stepId: 'email-step', name: 'Email' },
    ...overrides,
  } as JobEntity;
}

function buildWriter({ configured = true, enabled = true } = {}) {
  const repository = {
    isConfigured: vi.fn().mockReturnValue(configured),
    insertMany: vi.fn().mockResolvedValue(undefined),
  };
  const featureFlagsService = { getFlag: vi.fn().mockResolvedValue(enabled) };
  const logger = { setContext: vi.fn(), error: vi.fn() };
  const metricsService = { recordMetric: vi.fn() };
  const writer = new StepRunV2Writer(
    repository as unknown as StepRunV2Repository,
    featureFlagsService as unknown as FeatureFlagsService,
    logger as unknown as PinoLogger,
    metricsService as unknown as MetricsService
  );

  return { writer, repository, featureFlagsService, logger, metricsService };
}

describe('StepRunV2Writer', () => {
  it('does nothing when ClickHouse is not configured', async () => {
    const { writer, repository, featureFlagsService } = buildWriter({ configured: false });

    writer.write(buildJob());
    await new Promise((resolve) => setImmediate(resolve));

    expect(featureFlagsService.getFlag).not.toHaveBeenCalled();
    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('does nothing when the flag is off for the environment', async () => {
    const { writer, repository, featureFlagsService } = buildWriter({ enabled: false });

    writer.write(buildJob());

    await vi.waitFor(() => expect(featureFlagsService.getFlag).toHaveBeenCalled());
    await new Promise((resolve) => setImmediate(resolve));
    expect(featureFlagsService.getFlag).toHaveBeenCalledWith({
      key: FeatureFlagsKeysEnum.IS_STEP_RUNS_V2_WRITE_ENABLED,
      organization: { _id: 'org-1' },
      environment: { _id: 'env-1' },
      defaultValue: false,
    });
    expect(repository.insertMany).not.toHaveBeenCalled();
  });

  it('writes the status override instead of the job status', async () => {
    const { writer, repository } = buildWriter();

    writer.write(buildJob({ status: JobStatusEnum.QUEUED }), { status: JobStatusEnum.RUNNING });

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalled());
    const [rows] = repository.insertMany.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ step_run_id: 'job-1', status: 'running' });
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

  it('skips trigger jobs and missing jobs', async () => {
    const { writer, repository } = buildWriter();

    writer.writeMany([buildJob({ _id: 'trigger', type: StepTypeEnum.TRIGGER }), null, buildJob({ _id: 'job-2' })]);

    await vi.waitFor(() => expect(repository.insertMany).toHaveBeenCalled());
    const [rows] = repository.insertMany.mock.calls[0];
    expect(rows.map((row: { step_run_id: string }) => row.step_run_id)).toEqual(['job-2']);
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

  it('logs the row ids and records a metric when the insert fails, without throwing', async () => {
    const { writer, repository, logger, metricsService } = buildWriter();
    repository.insertMany.mockRejectedValue(new Error('ClickHouse down'));

    expect(() => writer.write(buildJob())).not.toThrow();

    await vi.waitFor(() => expect(logger.error).toHaveBeenCalled());
    expect(metricsService.recordMetric).toHaveBeenCalledWith(STEP_RUNS_V2_INSERT_ERROR_METRIC, 1);
    expect(logger.error.mock.calls[0][0]).toMatchObject({ stepRunIds: ['job-1'] });
  });
});
