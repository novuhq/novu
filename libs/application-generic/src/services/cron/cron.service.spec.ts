import { JobCronNameEnum } from '@novu/shared';
import { MetricsService } from '../metrics';
import { CronService } from './cron.service';
import { CronJobProcessor, CronMetrics, CronMetricsEventEnum, CronOptions } from './cron.types';

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

class TestCronService extends CronService {
  protected cronServiceName = 'TestCronService';
  public addJobMock = jest.fn<Promise<void>, [JobCronNameEnum, CronJobProcessor<unknown>, string, CronOptions]>();

  protected async addJob<TData = unknown>(
    jobName: JobCronNameEnum,
    processor: CronJobProcessor<TData>,
    interval: string,
    options: CronOptions
  ): Promise<void> {
    await this.addJobMock(jobName, processor as CronJobProcessor<unknown>, interval, options);
  }

  protected async removeJob(): Promise<void> {}

  protected async getMetrics(): Promise<CronMetrics> {
    return {} as CronMetrics;
  }

  protected async initialize(): Promise<void> {}

  protected async shutdown(): Promise<void> {}
}

describe('CronService', () => {
  const jobName = JobCronNameEnum.SEND_CRON_METRICS;
  const processor = jest.fn();
  const interval = '* * * * *';
  const metricsService = {
    recordMetric: jest.fn(),
  } as unknown as MetricsService;
  let service: TestCronService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestCronService(metricsService, [jobName]);
  });

  it('should wait for job registration before reporting success', async () => {
    let resolveRegistration = () => {};
    const registration = new Promise<void>((resolve) => {
      resolveRegistration = resolve;
    });
    service.addJobMock.mockReturnValueOnce(registration);

    const addPromise = service.add(jobName, processor, interval, {});

    expect(metricsService.recordMetric).toHaveBeenCalledWith(
      `Cron/default/${jobName}/${CronMetricsEventEnum.CREATE_STARTED}`,
      1
    );
    expect(metricsService.recordMetric).not.toHaveBeenCalledWith(
      `Cron/default/${jobName}/${CronMetricsEventEnum.CREATE_COMPLETED}`,
      1
    );

    resolveRegistration();
    await addPromise;

    expect(metricsService.recordMetric).toHaveBeenCalledWith(
      `Cron/default/${jobName}/${CronMetricsEventEnum.CREATE_COMPLETED}`,
      1
    );
  });

  it('should report and rethrow job registration errors', async () => {
    const error = new Error('Failed to register job');
    service.addJobMock.mockRejectedValueOnce(error);

    await expect(service.add(jobName, processor, interval, {})).rejects.toThrow(error);

    expect(metricsService.recordMetric).toHaveBeenCalledWith(
      `Cron/default/${jobName}/${CronMetricsEventEnum.CREATE_FAILED}`,
      1
    );
    expect(metricsService.recordMetric).not.toHaveBeenCalledWith(
      `Cron/default/${jobName}/${CronMetricsEventEnum.CREATE_COMPLETED}`,
      1
    );
  });
});
