import { Injectable, Logger } from '@nestjs/common';
const nr = require('newrelic');
import {
  JobTopicNameEnum,
  ObservabilityBackgroundTransactionEnum,
} from '@novu/shared';

import { INovuWorker } from '../readiness';
import { WorkerBaseService } from './worker-base.service';
import {
  SubscriberJobBoundCommand,
  SubscriberJobBoundUsecase,
} from '../../usecases';
import { PinoLogger, storage, Store } from '../../logging';

@Injectable()
export class SubscriberProcessWorkerService
  extends WorkerBaseService
  implements INovuWorker
{
  public readonly name = JobTopicNameEnum.SUBSCRIBER_PROCESS;
  private readonly LOG_CONTEXT = 'SubscriberProcessWorkerService';

  constructor(private subscriberJobBoundUsecase: SubscriberJobBoundUsecase) {
    super(JobTopicNameEnum.SUBSCRIBER_PROCESS);
    Logger.log(`Worker ${this.topic} instantiated`, this.LOG_CONTEXT);

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: SubscriberJobBoundCommand }) => {
      return await new Promise(async (resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.SUBSCRIBER_PROCESSING_QUEUE,
          'Trigger Engine',
          function () {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.subscriberJobBoundUsecase
                .execute(data)
                .then(resolve)
                .catch((e) => {
                  Logger.error(
                    e,
                    'unexpected error',
                    'SubscriberProcessWorkerService - getWorkerProcessor'
                  );
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

  private getWorkerOpts() {
    return {
      lockDuration: 90000,
      concurrency: 5,
    };
  }
}
