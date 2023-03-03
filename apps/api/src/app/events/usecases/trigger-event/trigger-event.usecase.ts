import { JobEntity, JobRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum, STEP_TYPE_TO_CHANNEL_TYPE } from '@novu/shared';
import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

import { TriggerEventCommand } from './trigger-event.command';

import { StoreSubscriberJobs, StoreSubscriberJobsCommand } from '../store-subscriber-jobs';
import { CreateNotificationJobsCommand, CreateNotificationJobs } from '../create-notification-jobs';
import { ProcessSubscriber, ProcessSubscriberCommand } from '../process-subscriber';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { ApiException } from '../../../shared/exceptions/api.exception';

const LOG_CONTEXT = 'TriggerEventUseCase';

@Injectable()
export class TriggerEvent {
  constructor(
    private storeSubscriberJobs: StoreSubscriberJobs,
    private createNotificationJobs: CreateNotificationJobs,
    private processSubscriber: ProcessSubscriber,
    private getDecryptedIntegrations: GetDecryptedIntegrations,
    private jobRepository: JobRepository,
    private notificationTemplateRepository: NotificationTemplateRepository
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

    const subscribersJobs: Omit<JobEntity, '_id' | 'createdAt' | 'updatedAt'>[][] = [];

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

        subscribersJobs.push(notificationJobs);
      }
    }

    for (const subscriberJobs of subscribersJobs) {
      const storeSubscriberJobsCommand = StoreSubscriberJobsCommand.create({
        environmentId: command.environmentId,
        jobs: subscriberJobs,
        organizationId: command.organizationId,
      });
      await this.storeSubscriberJobs.execute(storeSubscriberJobsCommand);
    }
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
