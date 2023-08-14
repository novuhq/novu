import { Injectable, Logger } from '@nestjs/common';
import { WorkerOptions } from 'bullmq';
const nr = require('newrelic');
import {
  INovuWorker,
  PinoLogger,
  storage,
  Store,
  TriggerEvent,
  TriggerEventCommand,
  TriggerQueueService,
} from '@novu/application-generic';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const LOG_CONTEXT = 'TriggerProcessorQueueService';

@Injectable()
export class TriggerProcessorQueueService extends TriggerQueueService implements INovuWorker {
  constructor(private triggerEventUsecase: TriggerEvent) {
    super();
    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerOpts(): WorkerOptions {
    return {
      lockDuration: 90000,
      concurrency: 200,
    };
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: TriggerEventCommand }) => {
      return await new Promise(async (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.TRIGGER_HANDLER_QUEUE,
          'Trigger Engine',
          function () {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.triggerEventUsecase
                .execute(data)
                .then(resolve)
                .catch(reject)
                .finally(() => {
                  transaction.end();
                });
            });
          }
        );
      });
    };
  }

  public async pauseWorker(): Promise<void> {
    Logger.log('Pausing worker', LOG_CONTEXT);
    await this.bullMqService.pauseWorker();
  }

  public async resumeWorker(): Promise<void> {
    Logger.log('Resuming worker', LOG_CONTEXT);
    await this.bullMqService.resumeWorker();
  }
}
