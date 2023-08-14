import { getRedisPrefix, JobTopicNameEnum } from '@novu/shared';
import { ConnectionOptions } from 'tls';
import { QueueOptions } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';

import { QueueService } from './queue.service';

const LOG_CONTEXT = 'WsQueueService';

@Injectable()
export class WsQueueService extends QueueService<Record<string, never>> {
  public readonly name = JobTopicNameEnum.WEB_SOCKETS;

  constructor() {
    super(JobTopicNameEnum.WEB_SOCKETS);
  }

  async getJobStats(
    type: string
  ): Promise<{ waiting: number; active: number }> {
    if (type === this.name) {
      return {
        waiting: await this.bullMqService.queue.getWaitingCount(),
        active: await this.bullMqService.queue.getActiveCount(),
      };
    }

    throw new Error(`Unexpected type ${type}`);
  }

  async cleanAllQueues() {
    await this.bullMqService.queue.drain();
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the WS Queue service down', LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log('Shutting down the WS Queue service has finished', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
