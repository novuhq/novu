import {
  JobEntity,
  JobRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  NotificationRepository,
} from '@novu/dal';
import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  InAppProviderIdEnum,
  StepTypeEnum,
  STEP_TYPE_TO_CHANNEL_TYPE,
} from '@novu/shared';
import * as Sentry from '@sentry/node';

import { TriggerEventCommand } from './trigger-event.command';

import { AddJob } from '../add-job/add-job.usecase';
import { CreateNotificationJobsCommand, CreateNotificationJobs } from '../create-notification-jobs';
import { ProcessSubscriber, ProcessSubscriberCommand } from '../process-subscriber';

import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { ApiException } from '../../../shared/exceptions/api.exception';

const LOG_CONTEXT = 'TriggerEventUseCase';

@Injectable()
export class TriggerEvent {
  constructor(
    private addJobUsecase: AddJob,
    private createNotificationJobs: CreateNotificationJobs,
    private processSubscriber: ProcessSubscriber,
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getDecryptedIntegrations: GetDecryptedIntegrations,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  async execute(command: TriggerEventCommand) {
    const { actor, environmentId, identifier, organizationId, to, userId } = command;

    await this.validateTransactionIdProperty(command.transactionId, organizationId, environmentId);

    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: identifier,
      },
    });

    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.identifier
    );

    /*
     * Makes no sense to execute anything if template doesn't exist
     * TODO: Send a 404?
     */
    if (!template) {
      const message = 'Notification template could not be found';
      Logger.error(message, LOG_CONTEXT);
      throw new ApiException(message);
    }

    const templateProviderIds = await this.getProviderIdsForTemplate(
      command.userId,
      command.organizationId,
      command.environmentId,
      template
    );

    const jobs: Omit<JobEntity, '_id'>[][] = [];

    // We might have a single actor for every trigger so we only need to check for it once
    let actorProcessed;
    if (actor) {
      actorProcessed = await this.processSubscriber.execute(
        ProcessSubscriberCommand.create({
          environmentId,
          organizationId,
          userId,
          subscriber: actor,
        })
      );
    }

    for (const subscriber of to) {
      const subscriberProcessed = await this.processSubscriber.execute(
        ProcessSubscriberCommand.create({
          environmentId,
          organizationId,
          userId,
          subscriber,
        })
      );

      // If no subscriber makes no sense to try to create notification
      if (subscriberProcessed) {
        const createNotificationJobsCommand = CreateNotificationJobsCommand.create({
          environmentId,
          identifier,
          organizationId,
          overrides: command.overrides,
          payload: command.payload,
          subscriber: subscriberProcessed,
          template,
          templateProviderIds,
          to: subscriber,
          transactionId: command.transactionId,
          userId,
          ...(actor && actorProcessed && { actor: actorProcessed }),
        });

        const notificationJobs = await this.createNotificationJobs.execute(createNotificationJobsCommand);

        jobs.push(notificationJobs);
      }
    }

    for (const job of jobs) {
      await this.storeAndAddJob(job);
    }
  }

  private async storeAndAddJob(jobs: Omit<JobEntity, '_id'>[]) {
    const storedJobs = await this.jobRepository.storeJobs(jobs);
    const channels = storedJobs
      .map((item) => item.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel) || channel === StepTypeEnum.TRIGGER) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    for (const job of storedJobs) {
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_CREATED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }

    const firstJob = storedJobs[0];

    await this.notificationRepository.update(
      {
        _organizationId: firstJob._organizationId,
        _id: firstJob._notificationId,
      },
      {
        $set: {
          channels: channels,
        },
      }
    );

    await this.addJobUsecase.execute({
      userId: firstJob._userId,
      environmentId: firstJob._environmentId,
      organizationId: firstJob._organizationId,
      jobId: firstJob._id,
      job: firstJob,
    });
  }

  private async validateTransactionIdProperty(
    transactionId: string,
    organizationId: string,
    environmentId: string
  ): Promise<void> {
    const found = await this.jobRepository.count({
      transactionId,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });

    if (found) {
      throw new ApiException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }
  }

  private async getProviderIdsForTemplate(
    userId: string,
    organizationId: string,
    environmentId: string,
    template: NotificationTemplateEntity
  ): Promise<Map<ChannelTypeEnum, string>> {
    const providers = new Map<ChannelTypeEnum, string>();

    for (const step of template?.steps) {
      const type = step.template?.type;
      if (type) {
        const channelType = STEP_TYPE_TO_CHANNEL_TYPE.get(type);

        if (channelType) {
          const provider = await this.getProviderId(userId, organizationId, environmentId, channelType);
          if (provider) {
            providers.set(channelType, provider);
          } else {
            providers.set(channelType, InAppProviderIdEnum.Novu);
          }
        }
      }
    }

    return providers;
  }

  private async getProviderId(
    userId: string,
    organizationId: string,
    environmentId: string,
    channelType: ChannelTypeEnum
  ): Promise<string> {
    const integrations = await this.getDecryptedIntegrations.execute(
      GetDecryptedIntegrationsCommand.create({
        channelType,
        active: true,
        organizationId,
        environmentId,
        userId,
      })
    );

    const integration = integrations[0];

    return integration?.providerId;
  }
}
