import { Logger } from '@nestjs/common';
import { QueueBaseOptions } from 'bullmq';
import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';

const LOG_CONTEXT = 'TriggerQueueService';

import { BullMqService } from './bull-mq.service';

export class TriggerQueueService {
  public readonly name = 'trigger-handler';
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
  public readonly bullMqService: BullMqService;

  constructor() {
    this.bullMqService = new BullMqService();

    this.bullMqService.createQueue(this.name, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public add(id: string, data: any, organizationId: string) {
    Logger.log(
      `TriggerQueueService.add: ${id} Group: ${organizationId}`,
      LOG_CONTEXT
    );

    this.bullMqService.add(
      id,
      data,
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
      organizationId
    );
  }

  public async gracefulShutdown() {
    Logger.log('Shutting the Trigger Queue service down', LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log(
      'Shutting down the Trigger Queue service has finished',
      LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
