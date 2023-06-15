import * as Bull from 'bull';
import { Queue } from 'bull';
import { IWsQueuePayload } from './queue.interface';
import { ConnectionOptions } from 'tls';

export const WS_SOCKET_QUEUE = 'ws_socket_queue';
import { getRedisPrefix } from '@novu/shared';

export class QueueService {
  private bullConfig: Bull.QueueOptions = {
    settings: {
      lockDuration: 90000,
    },
    redis: {
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

  public wsSocketQueue: Queue<IWsQueuePayload> = new Bull(WS_SOCKET_QUEUE, this.bullConfig) as Queue;

  async getJobStats(type: string): Promise<{ waiting: number; active: number }> {
    if (type === WS_SOCKET_QUEUE) {
      return {
        waiting: await this.wsSocketQueue.getWaitingCount(),
        active: await this.wsSocketQueue.getActiveCount(),
      };
    }

    throw new Error(`Unexpected type ${type}`);
  }

  async cleanAllQueues() {
    await this.wsSocketQueue.empty();
  }
}
