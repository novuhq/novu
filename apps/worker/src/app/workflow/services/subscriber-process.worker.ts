import { Injectable, Logger } from '@nestjs/common';
const nr = require('newrelic');
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import {
  SubscriberJobBound,
  SubscriberProcessWorkerService,
  PinoLogger,
  SubscriberJobBoundCommand,
  storage,
  Store,
} from '@novu/application-generic';

const LOG_CONTEXT = 'SubscriberProcessWorker';

@Injectable()
export class SubscriberProcessWorker extends SubscriberProcessWorkerService {
  constructor(private subscriberJobBoundUsecase: SubscriberJobBound) {
    super();
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
                  Logger.error(e, 'unexpected error', 'SubscriberProcessWorkerService - getWorkerProcessor');
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
      concurrency: 200,
    };
  }
}
