import { Injectable, Logger } from '@nestjs/common';
import {
  BullMqService,
  FeatureFlagsService,
  getWorkflowWorkerOptions,
  IWorkflowDataDto,
  Job,
  PinoLogger,
  SqsService,
  Store,
  storage,
  TriggerEvent,
  WorkerOptions,
  WorkerProcessor,
  WorkflowInMemoryProviderService,
  WorkflowWorkerService,
} from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const nr = require('newrelic');

const LOG_CONTEXT = 'WorkflowWorker';

@Injectable()
export class WorkflowWorker extends WorkflowWorkerService {
  constructor(
    private triggerEventUsecase: TriggerEvent,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private organizationRepository: CommunityOrganizationRepository,
    sqsService: SqsService,
    protected logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {
    super(new BullMqService(workflowInMemoryProviderService), sqsService, logger);
    this.logger.setContext(this.constructor.name);

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions(), true);

    /*
     * Workflow jobs run at-most-once: any failure here is acked so SQS
     * deletes the message. Trigger payloads that fail at this stage are
     * non-retryable client errors (duplicate `transactionId`, missing
     * `subscriberId`, payload validation, missing environment/template),
     * so redelivery cannot succeed and only burns consumer slots.
     *
     * Backed at the infra level by `RedrivePolicy.maxReceiveCount=1` on
     * the workflow SQS queue.
     */
    this.setSqsFailedHandler(async (job: Job<IWorkflowDataDto, void, string>, error: Error): Promise<boolean> => {
      Logger.warn(
        {
          jobId: job.id,
          transactionId: job.data?.transactionId,
          identifier: job.data?.identifier,
          organizationId: job.data?.organizationId,
          environmentId: job.data?.environmentId,
          attemptsMade: job.attemptsMade,
          error: error instanceof Error ? error.message : String(error),
        },
        'Workflow job failed, dropping (matches BullMQ at-most-once)',
        LOG_CONTEXT
      );

      return false;
    });

    this.startSqsConsumer();
  }

  private getWorkerOptions(): WorkerOptions {
    return getWorkflowWorkerOptions();
  }

  private async isKillSwitchEnabled(data: IWorkflowDataDto): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
      organization: { _id: data.organizationId },
      environment: { _id: data.environmentId },
      component: 'worker',
    });
  }

  private getWorkerProcessor(): WorkerProcessor {
    return async ({ data }: { data: IWorkflowDataDto }) => {
      const isKillSwitchEnabled = await this.isKillSwitchEnabled(data);

      if (isKillSwitchEnabled) {
        this.logger.warn(`Kill switch enabled for organizationId ${data.organizationId}. Skipping job.`);

        return;
      }

      const organizationExists = await this.organizationExist(data);

      if (!organizationExists) {
        this.logger.warn(`Organization not found for organizationId ${data.organizationId}. Skipping job.`);

        return;
      }

      return await new Promise((resolve, reject) => {
        const _this = this;

        this.logger.trace(`Job ${data.identifier} is being processed in the new instance workflow worker`);

        nr.startBackgroundTransaction(
          ObservabilityBackgroundTransactionEnum.TRIGGER_HANDLER_QUEUE,
          'Trigger Engine',
          function processTask() {
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

  private async organizationExist(data: IWorkflowDataDto): Promise<boolean> {
    const { organizationId } = data;
    const organization = await this.organizationRepository.findOne({ _id: organizationId });

    return !!organization;
  }
}
