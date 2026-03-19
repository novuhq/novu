import { JobCronNameEnum } from '@novu/shared';
import { JobPriority, Pulse } from '@pulsecron/pulse';
import { MetricsService } from '../metrics';
import { CronService } from './cron.service';
import { CronJobProcessor, CronMetrics, CronOptions } from './cron.types';

type PulsePriority = keyof typeof JobPriority;

function mapPriorityToPulse(priority: number | undefined): PulsePriority {
  if (priority === undefined || priority === 0) return 'normal';
  if (priority >= 20) return 'highest';
  if (priority >= 10) return 'high';
  if (priority <= -20) return 'lowest';
  if (priority <= -10) return 'low';

  return 'normal';
}

export class PulseCronService extends CronService {
  cronServiceName = 'PulseCronService';

  constructor(
    metricsService: MetricsService,
    activeJobs: JobCronNameEnum[],
    private pulse: Pulse
  ) {
    super(metricsService, activeJobs);
  }

  protected async addJob<TData>(
    jobName: JobCronNameEnum,
    processor: CronJobProcessor<TData>,
    interval: string,
    options: CronOptions
  ) {
    this.pulse.define(
      jobName,
      async (job) => {
        await processor({
          name: jobName,
          startedAt: job.attrs.lastRunAt,
          data: job.attrs.data as TData,
        });
      },
      {
        lockLifetime: options.lockLifetime,
        lockLimit: options.lockLimit,
        concurrency: options.concurrency,
        priority: mapPriorityToPulse(options.priority),
      }
    );

    await this.pulse.every(
      interval,
      jobName,
      {},
      {
        timezone: options.timezone,
      }
    );
  }

  protected async removeJob(jobName: string) {
    await this.pulse.cancel({ name: jobName });
  }

  protected async initialize() {
    await this.pulse.start();
  }

  protected async shutdown() {
    await this.pulse.stop();
  }

  protected async getMetrics() {
    const allJobs = await this.pulse.jobs({});

    const metrics = allJobs.reduce((acc, job) => {
      const jobName = job.attrs.name;
      if (!acc[jobName]) {
        acc[jobName] = { active: 0, waiting: 0 };
      }

      const lockedAt = job.attrs.lockedAt;
      const lastFinishedAt = job.attrs.lastFinishedAt;

      const isRunning = lockedAt && (!lastFinishedAt || lockedAt.getTime() > lastFinishedAt.getTime());
      const isWaiting = !isRunning && lastFinishedAt && !lockedAt;

      if (isRunning) {
        acc[jobName].active += 1;
      } else if (isWaiting) {
        acc[jobName].waiting += 1;
      }

      return acc;
    }, {} as CronMetrics);

    return metrics;
  }
}
