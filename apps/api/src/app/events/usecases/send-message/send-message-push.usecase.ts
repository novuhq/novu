import { Injectable } from '@nestjs/common';
import {
  IntegrationRepository,
  MessageRepository,
  NotificationStepEntity,
  NotificationRepository,
  SubscriberEntity,
  SubscriberRepository,
  NotificationEntity,
  MessageEntity,
} from '@novu/dal';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { PushFactory } from '../../services/push-service/push.factory';
import { SendMessageCommand } from './send-message.command';
import { SendMessageType } from './send-message-type.usecase';

@Injectable()
export class SendMessagePush extends SendMessageType {
  private pushFactory = new PushFactory();

  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    private integrationRepository: IntegrationRepository
  ) {
    super(messageRepository, createLogUsecase);
  }

  public async execute(command: SendMessageCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending Push',
    });
    const pushChannel: NotificationStepEntity = command.step;
    const notification = await this.notificationRepository.findById(command.notificationId);
    const subscriber: SubscriberEntity = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.subscriberId,
    });
    const contentService = new ContentService();
    const messageVariables = contentService.buildMessageVariables(command.payload, subscriber);
    const content = contentService.replaceVariables(pushChannel.template.content as string, messageVariables);
    const title = contentService.replaceVariables(pushChannel.template.title as string, messageVariables);
    const notificationIdentifiers = command.payload.notificationIdentifiers || subscriber.notificationIdentifiers;

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: pushChannel.template._id,
      channel: ChannelTypeEnum.PUSH,
      transactionId: command.transactionId,
      notificationIdentifiers,
      content,
      title,
      payload: messagePayload,
    });

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.PUSH,
      active: true,
    });

    if (notificationIdentifiers && integration) {
      await this.sendMessage(
        integration,
        notificationIdentifiers,
        title,
        content,
        message,
        command,
        notification,
        command.payload
      );

      return;
    }

    await this.sendErrors(notificationIdentifiers, integration, message, command, notification);
  }

  private async sendErrors(
    notificationIdentifiers,
    integration,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    if (!notificationIdentifiers) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Subscriber does not have active push notification receiver',
          userId: command.userId,
          subscriberId: command.subscriberId,
          code: LogCodeEnum.SUBSCRIBER_MISSING_PUSH,
          templateId: notification._templateId,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );
      await this.messageRepository.updateMessageStatus(
        message._id,
        'warning',
        null,
        'no_push_receiver',
        'Subscriber does not have active push notification receiver'
      );
    }
    if (!integration) {
      await this.sendErrorStatus(
        message,
        'warning',
        'push_missing_integration_error',
        'Subscriber does not have an active push integration',
        command,
        notification,
        LogCodeEnum.MISSING_PUSH_INTEGRATION
      );
    }
  }

  private async sendMessage(
    integration,
    target: string,
    title: string,
    content: string,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity,
    payload: object
  ) {
    try {
      const pushHandler = this.pushFactory.getHandler(integration);

      await pushHandler.send({
        target,
        title,
        content,
        payload,
      });
    } catch (e) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: e.message || e.name || 'Un-expect Push provider error',
          userId: command.userId,
          code: LogCodeEnum.PUSH_ERROR,
          templateId: notification._templateId,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );

      await this.messageRepository.updateMessageStatus(
        message._id,
        'error',
        e,
        'unexpected_push_error',
        e.message || e.name || 'Un-expect Push provider error'
      );
    }
  }
}
