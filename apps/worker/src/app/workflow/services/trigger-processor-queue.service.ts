import { Injectable } from '@nestjs/common';
const nr = require('newrelic');
import {
  TriggerQueueService,
  PinoLogger,
  storage,
  Store,
  TriggerEvent,
  TriggerEventCommand,
} from '@novu/application-generic';

@Injectable()
export class TriggerProcessorQueueService extends TriggerQueueService {
  constructor(private triggerEventUsecase: TriggerEvent) {
    super();
    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());
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
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        nr.startBackgroundTransaction('trigger-handler-queue', 'Trigger Engine', function () {
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
        });
      });
    };
  }
}
