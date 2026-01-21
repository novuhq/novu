import { Injectable } from '@nestjs/common';
import {
  BullMqService,
  getWorkflowWorkerOptions,
  IWorkflowDataDto,
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
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const nr = require('newrelic');

@Injectable()
export class WorkflowWorker extends WorkflowWorkerService {
  constructor(
    private triggerEventUsecase: TriggerEvent,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private organizationRepository: CommunityOrganizationRepository,
    sqsService: SqsService,
    logger: PinoLogger
  ) {
    super(new BullMqService(workflowInMemoryProviderService), sqsService, logger);
    if (this.logger) {
      this.logger.setContext(this.constructor.name);
    }
    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getWorkflowWorkerOptions();
  }

  private getWorkerProcessor(): WorkerProcessor {
    return async ({ data }: { data: IWorkflowDataDto }) => {
      this.logger?.debug(
        {
          dataKeys: Object.keys(data || {}),
          organizationId: data.organizationId,
          _organizationId: (data as any)._organizationId,
          hasOrganizationId: 'organizationId' in (data || {}),
          has_OrganizationId: '_organizationId' in (data || {}),
        },
        'WorkflowWorker data structure check'
      );

      const organizationExists = await this.organizationExist(data);

      if (!organizationExists) {
        this.logger?.warn(`Organization not found for organizationId ${data.organizationId}. Skipping job.`);

        return;
      }

      return await new Promise((resolve, reject) => {
        const _this = this;

        this.logger?.trace(`Job ${data.identifier} is being processed in the new instance workflow worker`);

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
    const organizationId = data.organizationId || (data as any)._organizationId;

    if (!organizationId) {
      this.logger?.warn({ data }, 'No organization ID found in data');
      return false;
    }

    const organization = await this.organizationRepository.findOne({ _id: organizationId });

    return !!organization;
  }
}
