import { SchedulerTopicNameEnum } from '@novu/shared';
import { Job } from '@hokify/agenda';
import { Injectable, Logger } from '@nestjs/common';

import { IJobDefinition } from '@hokify/agenda';
import { JobPriority } from '@hokify/agenda/dist/utils/priority';
import { Scheduler } from '../schedulers/providers/types';

const LOG_CONTEXT = 'ScheduledWorkerService';

export type ScheduledWorkerProcessor = <T>(data: Job<T>) => Promise<void>;

export type ScheduledWorkerOptions = Partial<
  Pick<IJobDefinition, 'lockLimit' | 'lockLifetime' | 'concurrency'>
> & {
  priority?: JobPriority;
};
@Injectable()
export class ScheduledWorkerBaseService {
  constructor(
    public readonly topic: SchedulerTopicNameEnum,
    protected instance: Scheduler
  ) {}

  public initWorker<T>(
    processor: ScheduledWorkerProcessor,
    options?: ScheduledWorkerOptions
  ): void {
    Logger.log(`Worker ${this.topic} initialized`, LOG_CONTEXT);

    this.instance.define<T>(this.topic, processor, options);
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(
      `Shutting the ${this.topic} scheduled worker service down`,
      LOG_CONTEXT
    );
    await this.instance.stop();

    Logger.log(
      `Shutting down the ${this.topic} scheduled worker service has finished`,
      LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
