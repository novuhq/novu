const nr = require('newrelic');
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { IJobData, ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import {
  INovuWorker,
  Job,
  OldInstanceBullMqService,
  PinoLogger,
  storage,
  Store,
  OldInstanceWorkflowWorkerService,
  TriggerEvent,
  WorkerOptions,
} from '@novu/application-generic';

const LOG_CONTEXT = 'OldInstanceWorkflowWorker';

/**
 * TODO: Temporary for migration to MemoryDB
 */
@Injectable()
export class OldInstanceWorkflowWorker extends OldInstanceWorkflowWorkerService implements INovuWorker {
  constructor(private triggerEventUsecase: TriggerEvent) {
    super();

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return {
      lockDuration: 90000,
      concurrency: 200,
    };
  }

  private getWorkerProcessor() {
    return async ({ data }: { data: IJobData | any }) => {
      return await new Promise(async (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        Logger.verbose(`Job ${data._id} is being processed in the old instance workflow worker`, LOG_CONTEXT);

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
