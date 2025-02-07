import { Injectable, Logger } from '@nestjs/common';

import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import {
  getSubscriberProcessWorkerOptions,
  SubscriberProcessWorkerService,
  PinoLogger,
  storage,
  Store,
  WorkerOptions,
  BullMqService,
  WorkflowInMemoryProviderService,
  IProcessSubscriberDataDto,
} from '@novu/application-generic';

import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { SubscriberJobBound } from '../usecases/subscriber-job-bound/subscriber-job-bound.usecase';
import { SubscriberJobBoundCommand } from '../usecases/subscriber-job-bound/subscriber-job-bound.command';

const nr = require('newrelic');

const LOG_CONTEXT = 'SubscriberProcessWorker';

@Injectable()
export class SubscriberProcessWorker extends SubscriberProcessWorkerService {
  constructor(
    private subscriberJobBoundUsecase: SubscriberJobBound,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private organizationRepository: CommunityOrganizationRepository
  ) {
    super(new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: IProcessSubscriberDataDto }) => {
      await this.checkOrganizationExist(data);

      return await new Promise((resolve, reject) => {
        const _this = this;

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.SUBSCRIBER_PROCESSING_QUEUE,
          'Trigger Engine',
          function processTask() {
            const transaction = nr.getTransaction();

            storage.run(new Store(PinoLogger.root), () => {
              _this.subscriberJobBoundUsecase
                .execute(data)
                .then(resolve)
                .catch((e) => {
                  Logger.error(e, 'unexpected error', 'SubscriberProcessWorkerService - getWorkerProcessor');
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

  private getWorkerOpts(): WorkerOptions {
    return getSubscriberProcessWorkerOptions();
  }

  private async checkOrganizationExist(data: IProcessSubscriberDataDto) {
    const { organizationId } = data;

    const organization = await this.organizationRepository.findOne({ _id: organizationId });

    if (!organization) {
      throw new Error('Organization not found');
    }
  }
}
