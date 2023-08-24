import { Injectable, Logger } from '@nestjs/common';
const nr = require('newrelic');
import {
  JobTopicNameEnum,
  ObservabilityBackgroundTransactionEnum,
} from '@novu/shared';

import { BullMqService } from '../../bull-mq.service';
import { SubscriberJobBoundUsecase } from '../../../usecases/subscriber-job-bound/subscriber-job-bound.usecase';
import { SubscriberJobBoundCommand } from '../../../usecases/subscriber-job-bound/subscriber-job-bound.command';
import { INovuWorker, PinoLogger, storage, Store } from '../../../index';

@Injectable()
export class SubscriberProcessWorkerService implements INovuWorker {
  private readonly LOG_CONTEXT = 'SubscriberProcessWorkerService';
  public readonly name = JobTopicNameEnum.SUBSCRIBER_PROCESS;
  constructor(
    private subscriberJobBoundUsecase: SubscriberJobBoundUsecase,
    public bullMqService: BullMqService
  ) {
    this.bullMqService.createWorker(
      this.name,
      this.getWorkerProcessor(),
      this.getWorkerOpts()
    );
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

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Trigger Queue service down', this.LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log(
      'Shutting down the Trigger Queue service has finished',
      this.LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  public async pauseWorker(): Promise<void> {
    Logger.log('Pausing worker', this.LOG_CONTEXT);
    await this.bullMqService.pauseWorker();
  }

  public async resumeWorker(): Promise<void> {
    Logger.log('Resuming worker', this.LOG_CONTEXT);
    await this.bullMqService.resumeWorker();
  }
}
