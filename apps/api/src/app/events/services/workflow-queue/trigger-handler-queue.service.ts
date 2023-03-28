import { Injectable } from '@nestjs/common';
import { QueueBaseOptions } from 'bullmq';
import { getRedisPrefix } from '@novu/shared';
import { ConnectionOptions } from 'tls';
import { PinoLogger, storage, Store } from '@novu/application-generic';

import { TriggerEvent, TriggerEventCommand } from '../../usecases/trigger-event';
import { BullmqService } from '@novu/application-generic';

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
    this.bullMqService = new BullmqService();

    this.bullMqService.createQueue(name, {
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
      concurrency: 200,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: TriggerEventCommand }) => {
      return await new Promise(async (resolve, reject) => {
        storage.run(new Store(PinoLogger.root), () => {
          this.triggerEventUsecase.execute(data).then(resolve).catch(reject);
        });
      });
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
