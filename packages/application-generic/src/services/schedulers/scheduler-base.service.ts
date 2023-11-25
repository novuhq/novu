import { SchedulerTopicNameEnum } from '@novu/shared';
import { Logger } from '@nestjs/common';
import { Scheduler } from './providers/types';

const LOG_CONTEXT = 'SchedulerService';

export class SchedulerBaseService {
  constructor(
    public readonly topic: SchedulerTopicNameEnum,
    protected instance: Scheduler
  ) {
    this.instance.on(`start:${this.topic}`, (job) => {
      Logger.log(
        `Job ${job.attrs.name} id:${job.attrs._id}, is starting`,
        LOG_CONTEXT
      );
    });
    this.instance.on(`complete:${this.topic}`, (job) => {
      Logger.log(
        `Job ${job.attrs.name} id:${job.attrs._id}, finished`,
        LOG_CONTEXT
      );
    });
    this.instance.on(`fail:${this.topic}`, (err, job) => {
      Logger.warn(
        `Job ${job.attrs.name} id:${job.attrs._id}, failed with an error ${err}`,
        LOG_CONTEXT
      );
    });
  }

  public schedule<T>(when: string | Date, data?: T): void {
    this.instance.schedule(when, this.topic, data);
  }
  public every<T>(interval: string | number, data?: T): void {
    this.instance.every(interval, this.topic, data);
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(
      `Shutting the ${this.topic} scheduler service down`,
      LOG_CONTEXT
    );

    await this.instance.stop();

    Logger.log(
      `Shutting down the ${this.topic} scheduler service has finished`,
      LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
