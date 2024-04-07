import { Injectable, Logger } from '@nestjs/common';
const nr = require('newrelic');
import {
  getExecutionLogWorkerOptions,
  PinoLogger,
  storage,
  Store,
  ExecutionLogWorkerService,
  WorkerOptions,
  WorkerProcessor,
  CreateExecutionDetails,
  BullMqService,
  WorkflowInMemoryProviderService,
  IExecutionLogJobDataDto,
} from '@novu/application-generic';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
const LOG_CONTEXT = 'ExecutionLogWorker';

@Injectable()
export class ExecutionLogWorker extends ExecutionLogWorkerService {
  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService
  ) {
    super(new BullMqService(workflowInMemoryProviderService));
    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getExecutionLogWorkerOptions();
  }

  private getWorkerProcessor(): WorkerProcessor {
    return async ({ data }: { data: IExecutionLogJobDataDto }) => {
      return await new Promise(async (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        Logger.verbose(`Job ${data.jobId} is being inserted into execution details collection`, LOG_CONTEXT);

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.EXECUTION_LOG_QUEUE,
          'Trigger Engine',
          function () {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.createExecutionDetails
                .execute(data)
                .then(resolve)
                .catch((e) => {
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
