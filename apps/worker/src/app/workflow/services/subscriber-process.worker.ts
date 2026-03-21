import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  FeatureFlagsService,
  getSubscriberProcessWorkerOptions,
  IProcessSubscriberDataDto,
  PinoLogger,
  SqsService,
  Store,
  SubscriberProcessWorkerService,
  storage,
  WorkerOptions,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { SubscriberJobBound } from '../usecases/subscriber-job-bound/subscriber-job-bound.usecase';

const nr = require('newrelic');

const LOG_CONTEXT = 'SubscriberProcessWorker';
const SUBSCRIBER_ID_VALIDATION_PREFIX = 'subscriberId under property to';

function isSubscriberIdValidationError(e: unknown): boolean {
  return (
    e instanceof BadRequestException &&
    typeof e.message === 'string' &&
    e.message.startsWith(SUBSCRIBER_ID_VALIDATION_PREFIX)
  );
}

@Injectable()
export class SubscriberProcessWorker extends SubscriberProcessWorkerService {
  constructor(
    private subscriberJobBoundUsecase: SubscriberJobBound,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private organizationRepository: CommunityOrganizationRepository,
    sqsService: SqsService,
    logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {
    super(new BullMqService(workflowInMemoryProviderService), sqsService, logger);

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private async isKillSwitchEnabled(data: IProcessSubscriberDataDto): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
      organization: { _id: data.organizationId },
      environment: { _id: data.environmentId },
      component: 'worker',
    });
  }

  public getWorkerProcessor() {
    return async ({ data }: { data: IProcessSubscriberDataDto }) => {
      const isKillSwitchEnabled = await this.isKillSwitchEnabled(data);

      if (isKillSwitchEnabled) {
        Logger.log(`Kill switch enabled for organizationId ${data.organizationId}. Skipping job.`, LOG_CONTEXT);

        return;
      }

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
                  if (isSubscriberIdValidationError(e)) {
                    Logger.debug(e, e.message, 'SubscriberProcessWorkerService - getWorkerProcessor');
                  } else {
                    Logger.error(e, 'unexpected error', 'SubscriberProcessWorkerService - getWorkerProcessor');
                    nr.noticeError(e);
                  }
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

  private async organizationExist(data: IProcessSubscriberDataDto): Promise<boolean> {
    const { organizationId } = data;

    const organization = await this.organizationRepository.findOne({ _id: organizationId });

    return !!organization;
  }
}
