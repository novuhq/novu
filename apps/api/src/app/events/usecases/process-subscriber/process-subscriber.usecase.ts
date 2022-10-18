import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  SubscriberRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  JobEntity,
  JobStatusEnum,
  NotificationStepEntity,
  NotificationTemplateEntity,
  IntegrationRepository,
} from '@novu/dal';
import {
  LogCodeEnum,
  LogStatusEnum,
  IPreferenceChannels,
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { ProcessSubscriberCommand } from './process-subscriber.command';
import { ISubscribersDefine } from '@novu/node';
import { DigestFilterSteps } from '../digest-filter-steps/digest-filter-steps.usecase';
import { DigestFilterStepsCommand } from '../digest-filter-steps/digest-filter-steps.command';
import {
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-template-preference';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { CreateExecutionDetailsCommand } from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';

@Injectable()
export class ProcessSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private createSubscriberUsecase: CreateSubscriber,
    private createLogUsecase: CreateLog,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private filterSteps: DigestFilterSteps,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private integrationRepository: IntegrationRepository,
    private createExecutionDetails: CreateExecutionDetails
  ) {}

  public async execute(command: ProcessSubscriberCommand): Promise<JobEntity[]> {
    const template = await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);

    const subscriber: SubscriberEntity = await this.getSubscriber(command);
    if (subscriber === null) {
      return [];
    }

    const notification = await this.createNotification(command, template._id, subscriber);

    const preferredSubscriberSteps = await this.filterPreferredChannels(
      command.organizationId,
      command.environmentId,
      subscriber._id,
      template,
      command.templateId,
      notification._id
    );

    const steps: NotificationStepEntity[] = await this.filterSteps.execute(
      DigestFilterStepsCommand.create({
        subscriberId: subscriber._id,
        payload: command.payload,
        steps: preferredSubscriberSteps,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        templateId: template._id,
      })
    );

    this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.INFO,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        text: 'Request processed',
        userId: command.userId,
        subscriberId: subscriber._id,
        code: LogCodeEnum.TRIGGER_PROCESSED,
        templateId: notification._templateId,
      })
    );

    const jobs: JobEntity[] = [];

    for (const step of steps) {
      const integration = await this.integrationRepository.findOne({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channel: step.template.type,
        active: true,
      });
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
        providerId: integration?.providerId,
      });
    }

    return jobs;
  }

  private async getSubscriber(command: ProcessSubscriberCommand): Promise<SubscriberEntity> {
    const subscriberPayload = command.to;
    const subscriber = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      subscriberId: subscriberPayload.subscriberId,
    });

    if (subscriber && !this.subscriberNeedUpdate(subscriber, subscriberPayload)) {
      return subscriber;
    }

    return await this.createOrUpdateSubscriber(command, subscriberPayload);
  }

  private async createOrUpdateSubscriber(command: ProcessSubscriberCommand, subscriberPayload) {
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
      })
    );
  }

  private subscriberNeedUpdate(subscriber: SubscriberEntity, subscriberPayload: ISubscribersDefine): boolean {
    return (
      (subscriberPayload?.email && subscriber?.email !== subscriberPayload?.email) ||
      (subscriberPayload?.firstName && subscriber?.firstName !== subscriberPayload?.firstName) ||
      (subscriberPayload?.lastName && subscriber?.lastName !== subscriberPayload?.lastName) ||
      (subscriberPayload?.phone && subscriber?.phone !== subscriberPayload?.phone) ||
      (subscriberPayload?.avatar && subscriber?.avatar !== subscriberPayload?.avatar)
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
    });
  }

  private async filterPreferredChannels(
    organizationId: string,
    environmentId: string,
    subscriberId: string,
    template: NotificationTemplateEntity,
    transactionId: string,
    notificationId: string
  ): Promise<NotificationStepEntity[]> {
    const buildCommand = GetSubscriberTemplatePreferenceCommand.create({
      organizationId: organizationId,
      subscriberId: subscriberId,
      environmentId: environmentId,
      template,
    });

    const preference = (await this.getSubscriberTemplatePreferenceUsecase.execute(buildCommand)).preference;

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        environmentId: environmentId,
        organizationId: organizationId,
        subscriberId: subscriberId,
        notificationId: notificationId,
        notificationTemplateId: template._id,
        transactionId: transactionId,
        detail: `Steps filtered by subscriber preferences`,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(preference),
      })
    );

    return template.steps.filter((step) => this.actionStep(step) || this.stepPreferred(preference, step));
  }

  private stepPreferred(preference: { enabled: boolean; channels: IPreferenceChannels }, step: NotificationStepEntity) {
    const templatePreferred = preference.enabled;

    const channelPreferred = Object.keys(preference.channels).some(
      (channelKey) => channelKey === step.template.type && preference.channels[step.template.type]
    );

    return templatePreferred && channelPreferred;
  }

  private actionStep(step) {
    const channels = [ChannelTypeEnum.IN_APP, ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS, 'push', 'chat'];

    return !channels.some((channel) => channel === step.template.type);
  }
}
