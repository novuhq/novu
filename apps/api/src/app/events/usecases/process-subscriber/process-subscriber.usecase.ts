import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  SubscriberRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  JobEntity,
  JobStatusEnum,
  NotificationStepEntity,
  IntegrationRepository,
} from '@novu/dal';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { ProcessSubscriberCommand } from './process-subscriber.command';
import { ISubscribersDefine } from '@novu/node';
import { DigestFilterSteps } from '../digest-filter-steps/digest-filter-steps.usecase';
import { DigestFilterStepsCommand } from '../digest-filter-steps/digest-filter-steps.command';

@Injectable()
export class ProcessSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private createSubscriberUsecase: CreateSubscriber,
    private createLogUsecase: CreateLog,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private filterSteps: DigestFilterSteps,
    private integrationRepository: IntegrationRepository
  ) {}

  public async execute(command: ProcessSubscriberCommand): Promise<JobEntity[]> {
    const template = await this.notificationTemplateRepository.findById(command.templateId, command.environmentId);

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
    let actorSubscriber: SubscriberEntity;
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
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
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
        ...(actorSubscriber && { _actorId: actorSubscriber._id }),
      });
    }

    return jobs;
  }

  private async getSubscriber(
    command: Pick<ProcessSubscriberCommand, 'environmentId' | 'organizationId'>,
    subscriberPayload
  ): Promise<SubscriberEntity> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      subscriberPayload.subscriberId
    );

    if (subscriber && !this.subscriberNeedUpdate(subscriber, subscriberPayload)) {
      return subscriber;
    }

    return await this.createOrUpdateSubscriber(command, subscriberPayload);
  }

  private async createOrUpdateSubscriber(
    command: Pick<ProcessSubscriberCommand, 'environmentId' | 'organizationId'>,
    subscriberPayload
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
      to: command.to,
      payload: command.payload,
    });
  }
}
