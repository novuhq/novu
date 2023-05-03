import { Logger } from '@nestjs/common';
import { QueueBaseOptions } from 'bullmq';
import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';

import { BullmqService } from './bull-mq.service';

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
  public readonly bullMqService: BullmqService;

  constructor() {
    this.bullMqService = new BullmqService();

    this.bullMqService.createQueue(this.name, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public add(id: string, data: any, organizationId: string) {
    Logger.log(`TriggerQueueService.add: ${id} Group: ${organizationId}`);

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
}
