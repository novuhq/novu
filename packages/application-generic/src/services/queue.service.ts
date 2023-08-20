import { IJobData, JobTopicNameEnum } from '@novu/shared';
import { Logger } from '@nestjs/common';

import { BullMqService, JobsOptions } from './bull-mq.service';

const LOG_CONTEXT = 'QueueService';

export class QueueService<T = unknown> {
  public readonly bullMqService: BullMqService;
  public readonly DEFAULT_ATTEMPTS = 3;

  constructor(public name = JobTopicNameEnum.STANDARD) {
    this.bullMqService = new BullMqService();
    this.bullMqService.createQueue(this.name, {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Queue service down', LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log('Shutting down the Queue service has finished', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  public async addToQueue(
    id: string,
    data?: IJobData,
    groupId?: string,
    options: JobsOptions = {}
  ) {
    const bullMqJobData = data
      ? {
          _environmentId: data._environmentId,
          _id: id,
          _organizationId: data._organizationId,
          _userId: data._userId,
        }
      : undefined;

    await this.bullMqService.add(
      id,
      bullMqJobData,
      {
        removeOnComplete: true,
        removeOnFail: true,
        ...options,
      },
      groupId
    );
  }
}
