import { Inject, Injectable, Logger } from '@nestjs/common';
const nr = require('newrelic');
import {
  INovuWorker,
  OldInstanceBullMqService,
  PinoLogger,
  storage,
  Store,
  TriggerEvent,
  TriggerEventCommand,
  OldInstanceWorkflowWorkerService,
  WorkerOptions,
  WorkerProcessor,
} from '@novu/application-generic';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const LOG_CONTEXT = 'OldInstanceWorkflowWorker';

/**
 * TODO: Temporary for migration to MemoryDB
 */
@Injectable()
export class OldInstanceWorkflowWorker extends OldInstanceWorkflowWorkerService implements INovuWorker {
  constructor(
    @Inject(TriggerEvent)
    private triggerEventUsecase: TriggerEvent
  ) {
    super();

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 90000,
      concurrency: 200,
    };
  }

  private getWorkerProcessor(): WorkerProcessor {
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
}
