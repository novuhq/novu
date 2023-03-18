import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum, STEP_TYPE_TO_CHANNEL_TYPE } from '@novu/shared';

import { TriggerEventCommand } from './trigger-event.command';
import { ProcessSubscriber } from '../process-subscriber/process-subscriber.usecase';
import { ProcessSubscriberCommand } from '../process-subscriber/process-subscriber.command';

import { EventsPerformanceService } from '../../services/performance-service';

import { ProcessNotification } from '../process-notification/process-notification.usecase';
import { ProcessNotificationCommand } from '../process-notification/process-notification.command';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class TriggerEvent {
  constructor(
    private processSubscriber: ProcessSubscriber,
    private processNotification: ProcessNotification,
    private getDecryptedIntegrations: GetDecryptedIntegrations,
    private notificationTemplateRepository: NotificationTemplateRepository,
    protected performanceService: EventsPerformanceService
  ) {}

  async execute(command: TriggerEventCommand) {
    const mark = this.performanceService.buildTriggerEventMark(command.identifier, command.transactionId);

    const { actor, environmentId, transactionId, organizationId, to, userId } = command;

    await this.processNotification.validateTransactionIdProperty(transactionId, organizationId, environmentId);

    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
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
      throw new ApiException(message);
    }

    const templateProviderIds = await this.getProviderIdsForTemplate(
      command.userId,
      command.organizationId,
      command.environmentId,
      template
    );
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

      if (!subscriberProcessed) continue; //Skipping the job
      await this.processNotification.execute(
        ProcessNotificationCommand.create({
          environmentId,
          organizationId,
          identifier: command.identifier,
          payload: command.payload,
          overrides: command.overrides,
          subscriber: subscriberProcessed,
          transactionId: command.transactionId,
          userId,
          ...(actor && actorProcessed && { actor: actorProcessed }),
          template,
          templateProviderIds,
        })
      );
    }

    this.performanceService.setEnd(mark);
  }

  /*
   * Consider removing this as providerId decided while sending the messages,
   * why to pre-populate next layer info here in jobs?  there is no guarantee
   * same providerId is used while sending message
   */
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
