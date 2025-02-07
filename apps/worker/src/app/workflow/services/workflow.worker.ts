import { Injectable, Logger } from '@nestjs/common';
import {
  getWorkflowWorkerOptions,
  PinoLogger,
  storage,
  Store,
  TriggerEvent,
  WorkflowWorkerService,
  WorkerOptions,
  WorkerProcessor,
  BullMqService,
  WorkflowInMemoryProviderService,
  IWorkflowDataDto,
} from '@novu/application-generic';
import { CommunityOrganizationRepository, CommunityUserRepository } from '@novu/dal';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const nr = require('newrelic');

const LOG_CONTEXT = 'WorkflowWorker';

@Injectable()
export class WorkflowWorker extends WorkflowWorkerService {
  constructor(
    private triggerEventUsecase: TriggerEvent,
    public workflowInMemoryProviderService: WorkflowInMemoryProviderService,
    private organizationRepository: CommunityOrganizationRepository,
    private userRepository: CommunityUserRepository
  ) {
    super(new BullMqService(workflowInMemoryProviderService));

    this.initWorker(this.getWorkerProcessor(), this.getWorkerOptions());
  }

  private getWorkerOptions(): WorkerOptions {
    return getWorkflowWorkerOptions();
  }

  private getWorkerProcessor(): WorkerProcessor {
    return async ({ data }: { data: IWorkflowDataDto }) => {
      await this.checkOrganizationAndUserExist(data);

      return await new Promise((resolve, reject) => {
        const _this = this;

        Logger.verbose(`Job ${data.identifier} is being processed in the new instance workflow worker`, LOG_CONTEXT);

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

  private async checkOrganizationAndUserExist(data: IWorkflowDataDto) {
    const { organizationId, userId } = data;

    const organization = await this.organizationRepository.findOne({ _id: organizationId });
    const user = await this.userRepository.findOne({ _id: userId });

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (!user) {
      throw new Error('User not found');
    }
  }
}
