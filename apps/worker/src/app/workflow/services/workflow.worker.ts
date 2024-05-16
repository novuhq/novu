import { Injectable, Logger } from '@nestjs/common';
const nr = require('newrelic');
import {
  getWorkflowWorkerOptions,
  PinoLogger,
  storage,
  Store,
  TriggerEvent,
  TriggerEventCommand,
  WorkflowWorkerService,
  WorkerOptions,
  WorkerProcessor,
  BullMqService,
  WorkflowInMemoryProviderService,
  IWorkflowDataDto,
} from '@novu/application-generic';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const LOG_CONTEXT = 'WorkflowWorker';

@Injectable()
export class WorkflowWorker extends WorkflowWorkerService {
  constructor(
    private triggerEventUsecase: TriggerEvent,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getWorkflowWorkerOptions();
  }

  private getWorkerProcessor(): WorkerProcessor {
    return async ({ data }: { data: IWorkflowDataDto }) => {
      return await new Promise(async (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        Logger.verbose(`Job ${data.identifier} is being processed in the new instance workflow worker`, LOG_CONTEXT);

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.TRIGGER_HANDLER_QUEUE,
          'Trigger Engine',
          function () {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.triggerEventUsecase
                .execute(data)
                .then(resolve)
                .catch((e) => {
                  nr.noticeError(e);
                  reject(e);
                })
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
