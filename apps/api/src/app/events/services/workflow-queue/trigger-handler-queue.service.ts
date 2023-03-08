import { Injectable } from '@nestjs/common';
import { Queue, QueueBaseOptions, Worker } from 'bullmq';
import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';

import { TriggerEvent, TriggerEventCommand } from '../../usecases/trigger-event';

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
  public readonly queue: Queue;
  public readonly worker: Worker;

  constructor(private triggerEventUsecase: TriggerEvent) {
    this.queue = new Queue<TriggerEventCommand>('trigger-handler', {
      ...this.bullConfig,
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });

    this.worker = new Worker('trigger-handler', this.getWorkerProcessor(), this.getWorkerOpts());
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
}
