import { Injectable } from '@nestjs/common';
import { NotificationRepository, SubscriberRepository, NotificationTemplateRepository } from '@novu/dal';
import { LogCodeEnum, LogStatusEnum } from '@novu/shared';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { ProcessSubscriberCommand } from './process-subscriber.command';
import { matchMessageWithFilters } from '../trigger-event/message-filter.matcher';
import { SendMessage } from '../send-message/send-message.usecase';
import { SendMessageCommand } from '../send-message/send-message.command';
import { SubscriberEntity } from '../../../../../../../libs/dal/src/repositories/subscriber/subscriber.entity';

@Injectable()
export class ProcessSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private createSubscriberUsecase: CreateSubscriber,
    private createLogUsecase: CreateLog,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private sendMessage: SendMessage
  ) {}

  public async execute(command: ProcessSubscriberCommand) {
    const template = await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);

    let notification;
    let subscriber: SubscriberEntity;
    try {
      subscriber = await this.getSubscriber(command, template._id);
      notification = await this.createNotification(command, template._id, subscriber.subscriberId);
    } catch (e) {
      return {
        status: 'subscriber_not_found',
      };
    }

    const steps = matchMessageWithFilters(template.steps, command.payload);
    for (const step of steps) {
      await this.sendMessage.execute(
        SendMessageCommand.create({
          identifier: command.identifier,
          payload: command.payload,
          step,
          transactionId: command.identifier,
          notificationID: notification._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          subscriberId: subscriber._id,
        })
      );
    }

    await this.createLogUsecase.execute(
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

    return {
      status: 'success',
    };
  }

  private async getSubscriber(command: ProcessSubscriberCommand, templateId: string): Promise<SubscriberEntity> {
    const subscriberPayload = command.to;
    const subscriber = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      subscriberId: subscriberPayload.subscriberId,
    });

    if (subscriber) {
      return subscriber;
    }
    if (subscriberPayload.email || subscriberPayload.phone) {
      return await this.createSubscriberUsecase.execute(
        CreateSubscriberCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: subscriberPayload.subscriberId,
          email: subscriberPayload.email,
          firstName: subscriberPayload.firstName,
          lastName: subscriberPayload.lastName,
          phone: subscriberPayload.phone,
        })
      );
    }
    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.ERROR,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        text: 'Subscriber not found',
        userId: command.userId,
        code: LogCodeEnum.SUBSCRIBER_NOT_FOUND,
        templateId: templateId,
        raw: {
          payload: command.payload,
          subscriber: subscriberPayload,
          triggerIdentifier: command.identifier,
        },
      })
    );

    throw new Error('subscriber_not_found');
  }

  private async createNotification(command: ProcessSubscriberCommand, templateId: string, subscriberId: string) {
    return await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriberId,
      _templateId: templateId,
      transactionId: command.transactionId,
    });
  }
}
