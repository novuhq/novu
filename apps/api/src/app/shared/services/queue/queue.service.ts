import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';
import { BullmqService } from '@novu/application-generic';
import { QueueOptions } from 'bullmq';

export const WS_SOCKET_QUEUE = 'ws_socket_queue';

export class QueueService {
  private bullConfig: QueueOptions = {
    connection: {
      db: Number(process.env.REDIS_DB_INDEX),
      port: Number(process.env.REDIS_PORT),
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 50000,
      keepAlive: 30000,
      family: 4,
      keyPrefix: getRedisPrefix(),
      tls: process.env.REDIS_TLS as ConnectionOptions,
    },
    defaultJobOptions: {
      removeOnComplete: true,
    },
  };

  public readonly bullMqService: BullmqService;

  constructor() {
    this.bullMqService = new BullmqService();
    this.bullMqService.createQueue(WS_SOCKET_QUEUE, this.bullConfig);
  }

  async getJobStats(type: string): Promise<{ waiting: number; active: number }> {
    if (type === WS_SOCKET_QUEUE) {
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
