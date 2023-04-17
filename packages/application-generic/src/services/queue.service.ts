import { JobsOptions, QueueBaseOptions } from 'bullmq';
import { ConnectionOptions } from 'tls';
import { getRedisPrefix } from '@novu/shared';

import { BullmqService } from './bull-mq.service';

export class QueueService<T = unknown> {
  public readonly name = 'standard';
  protected bullConfig: QueueBaseOptions = {
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
  };
  public readonly bullMqService: BullmqService;
  public readonly DEFAULT_ATTEMPTS = 3;

  constructor() {
    this.bullMqService = new BullmqService();

    this.bullMqService.createQueue(this.name, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public async gracefulShutdown() {
    // Right now we only want this for testing purposes
    if (process.env.NODE_ENV === 'test') {
      await this.bullMqService.queue.drain();
      if (this.bullMqService.worker) {
        await this.bullMqService.worker.close();
      }
    }
  }

  public async addToQueue(
    id: string,
    data: T,
    groupId?: string,
    options: JobsOptions = {}
  ) {
    await this.bullMqService.add(
      id,
      data,
      {
        removeOnComplete: true,
        removeOnFail: true,
        ...options,
      },
      groupId
    );
  }
}
