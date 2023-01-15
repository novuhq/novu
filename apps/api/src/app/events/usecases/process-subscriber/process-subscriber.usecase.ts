import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  SubscriberRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  JobEntity,
  JobStatusEnum,
  NotificationStepEntity,
} from '@novu/dal';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum, InAppProviderIdEnum } from '@novu/shared';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { CreateLog, CreateLogCommand } from '../../../logs/usecases';
import { ProcessSubscriberCommand } from './process-subscriber.command';
import { DigestFilterSteps } from '../digest-filter-steps/digest-filter-steps.usecase';
import { DigestFilterStepsCommand } from '../digest-filter-steps/digest-filter-steps.command';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import { Cached } from '../../../shared/interceptors';
import { ApiException } from '../../../shared/exceptions/api.exception';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { subscriberNeedUpdate } from '../../../subscribers/usecases/update-subscriber';

@Injectable()
export class ProcessSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private createSubscriberUsecase: CreateSubscriber,
    private createLogUsecase: CreateLog,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private filterSteps: DigestFilterSteps,
    private getDecryptedIntegrations: GetDecryptedIntegrations
  ) {}

  public async execute(command: ProcessSubscriberCommand): Promise<Omit<JobEntity, '_id'>[]> {
    const template =
      command.template ??
      (await this.getNotificationTemplate({
        _id: command.templateId,
        environmentId: command.environmentId,
      }));

    const subscriber: SubscriberEntity = await this.getSubscriber(
      {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      },
      command.to
    );

    if (subscriber === null) {
      return [];
    }

    let actorSubscriber: SubscriberEntity | null = null;
    if (command.actor) {
      actorSubscriber = await this.getSubscriber(
        {
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
        command.actor
      );
    }

    const notification = await this.createNotification(command, template._id, subscriber);

    const steps: NotificationStepEntity[] = await this.filterSteps.execute(
      DigestFilterStepsCommand.create({
        subscriberId: subscriber._id,
        payload: command.payload,
        steps: template.steps,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        templateId: template._id,
        notificationId: notification._id,
      })
    );

    const jobs: Omit<JobEntity, '_id'>[] = [];

    for (const step of steps) {
      if (!step.template) throw new ApiException('Step template was not found');

      const integrations = await this.getDecryptedIntegrations.execute(
        GetDecryptedIntegrationsCommand.create({
          channelType: ChannelTypeEnum[step.template.type],
          active: true,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        })
      );

      const integration = integrations[0];

      jobs.push({
        identifier: command.identifier,
        payload: command.payload,
        overrides: command.overrides,
        step,
        transactionId: command.transactionId,
        _notificationId: notification._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _userId: command.userId,
        _subscriberId: subscriber._id,
        status: JobStatusEnum.PENDING,
        _templateId: notification._templateId,
        digest: step.metadata,
        type: step.template.type,
        providerId: integration?.providerId ?? InAppProviderIdEnum.Novu,
        ...(actorSubscriber && { _actorId: actorSubscriber._id }),
      });
    }

    return jobs;
  }

  @Cached(CacheKeyPrefixEnum.NOTIFICATION_TEMPLATE)
  private async getNotificationTemplate({ _id, environmentId }: { _id: string; environmentId: string }) {
    return await this.notificationTemplateRepository.findById(_id, environmentId);
  }

  private async getSubscriber(
    command: Pick<ProcessSubscriberCommand, 'environmentId' | 'organizationId'>,
    subscriberPayload
  ): Promise<SubscriberEntity> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      subscriberPayload.subscriberId
    );

    if (subscriber && !subscriberNeedUpdate(subscriber, subscriberPayload)) {
      return subscriber;
    }

    return await this.createOrUpdateSubscriber(command, subscriberPayload, subscriber);
  }

  private async createOrUpdateSubscriber(
    command: Pick<ProcessSubscriberCommand, 'environmentId' | 'organizationId'>,
    subscriberPayload,
    subscriber: SubscriberEntity | null
  ) {
    return await this.createSubscriberUsecase.execute(
      CreateSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: subscriberPayload?.subscriberId,
        email: subscriberPayload?.email,
        firstName: subscriberPayload?.firstName,
        lastName: subscriberPayload?.lastName,
        phone: subscriberPayload?.phone,
        avatar: subscriberPayload?.avatar,
        subscriber: subscriber ?? undefined,
      })
    );
  }

  private async createNotification(
    command: ProcessSubscriberCommand,
    templateId: string,
    subscriber: SubscriberEntity
  ) {
    return await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: templateId,
      transactionId: command.transactionId,
      to: command.to,
      payload: command.payload,
    });
  }
}
