import { Injectable } from '@nestjs/common';
import { QueueBaseOptions } from 'bullmq';
import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';

import { TriggerEvent, TriggerEventCommand } from '../../usecases/trigger-event';
import { BullmqService } from '../../../shared/services/bullmq/bull-mq.service';

@Injectable()
export class TriggerHandlerQueueService {
  private bullConfig: QueueBaseOptions = {
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
  private readonly bullMqService: BullmqService;

  constructor(private triggerEventUsecase: TriggerEvent) {
    const name = 'trigger-handler';
    this.bullMqService = new BullmqService(name, {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.bullMqService.createWorker(name, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerOpts() {
    return {
      ...this.bullConfig,
      lockDuration: 90000,
      concurrency: 50,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: TriggerEventCommand }) => {
      return this.triggerEventUsecase.execute(data);
    };
  }

  public add(id: string, data: any, organizationId: string) {
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
