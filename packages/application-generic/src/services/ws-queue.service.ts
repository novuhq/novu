import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';
import { QueueOptions } from 'bullmq';

import { BullmqService } from './bull-mq.service';
import { QueueService } from './queue.service';

export class WsQueueService extends QueueService<Record<string, never>> {
  public static queueName = 'ws_socket_queue';
  constructor() {
    super('ws_socket_queue');
  }

  public readonly bullMqService: BullmqService;

  async getJobStats(
    type: string
  ): Promise<{ waiting: number; active: number }> {
    if (type === WsQueueService.queueName) {
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
}
