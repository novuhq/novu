import { Agenda } from '@hokify/agenda';
import { Logger } from '@nestjs/common';
import { JobCronNameEnum } from '@novu/shared';
import { CronService } from './cron.service';
import { CronJobProcessor, CronMetrics, CronOptions } from './cron.types';
import os from 'os';

export class AgendaCronService extends CronService {
  cronServiceName = 'AgendaCronService';
  private agenda: Agenda = new Agenda({
    db: { address: process.env.MONGO_URI },
    /**
     * Sets the hostname for the Job. Used to debug last host to run the job via the collection
     *
     * @see https://github.com/agenda/agenda/tree/master?tab=readme-ov-file#namename
     */
    name: os.hostname + '-' + process.pid,
  });

  protected async addJob<TData>(
    jobName: JobCronNameEnum,
    processor: CronJobProcessor<TData>,
    interval: string,
    options: CronOptions
  ) {
    this.agenda.define(
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
        priority: options.priority,
      }
    );

    await this.agenda.every(interval, jobName, {
      timezone: options.timezone,
    });
  }

  protected async removeJob(jobName: string) {
    await this.agenda.cancel({ name: jobName });
  }

  protected async initialize() {
    await this.agenda.ready;
    await this.agenda.start();
  }

  protected async shutdown() {
    await this.agenda.stop();
  }

  protected async getMetrics() {
    const stats = await this.agenda.getRunningStats();

    const metrics = Object.entries(stats.jobStatus).reduce(
      (acc, [jobName, status]) => {
        acc[jobName] = {
          active: status.running,
          waiting: status.locked,
        };

        return acc;
      },
      {} as CronMetrics
    );

    return metrics;
  }
}
