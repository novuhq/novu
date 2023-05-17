import { Injectable, Logger } from '@nestjs/common';
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

const LOG_CONTEXT = 'TriggerWorkerService';

@Injectable()
export class TriggerWorkerService extends TriggerQueueService implements INovuWorker {
  constructor(private triggerEventUsecase: TriggerEvent) {
    super();
    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerOpts() {
    return {
      ...this.bullConfig,
      autorun: false,
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

  public async pauseWorker(): Promise<void> {
    Logger.log('Pausing worker', LOG_CONTEXT);
    await this.bullMqService.pauseWorker();
  }

  public async resumeWorker(): Promise<void> {
    Logger.log('Resuming worker', LOG_CONTEXT);
    await this.bullMqService.resumeWorker();
  }
}
