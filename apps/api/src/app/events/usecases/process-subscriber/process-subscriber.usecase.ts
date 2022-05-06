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
    try {
      notification = await this.createNotification(command, template._id);
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
        subscriberId: notification._subscriberId,
        code: LogCodeEnum.TRIGGER_PROCESSED,
        templateId: notification._templateId,
      })
    );

    return {
      status: 'success',
    };
  }

  private async getSubscriber(command: ProcessSubscriberCommand, templateId: string): Promise<string> {
    const subscriberPayload = command.to;
    const countSubscriber = await this.subscriberRepository.count({
      _environmentId: command.environmentId,
      subscriberId: subscriberPayload.subscriberId,
    });

    if (countSubscriber > 0) {
      return subscriberPayload.subscriberId;
    }
    if (subscriberPayload.email || subscriberPayload.phone) {
      const subscriber = await this.createSubscriberUsecase.execute(
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

      return subscriber.subscriberId;
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

  private async createNotification(command: ProcessSubscriberCommand, templateId: string) {
    const subscriberId = await this.getSubscriber(command, templateId);

    return await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriberId,
      _templateId: templateId,
      transactionId: command.transactionId,
    });
  }
}
