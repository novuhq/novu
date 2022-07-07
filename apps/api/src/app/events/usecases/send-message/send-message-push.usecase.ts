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
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum, PushProviderIdEnum } from '@novu/shared';
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
    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.PUSH,
      active: true,
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
    const overrides = command.overrides[integration.providerId] || {};
    const pushChannels = subscriber.channels.filter((chan) =>
      Object.values(PushProviderIdEnum).includes(chan.providerId as PushProviderIdEnum)
    );

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    if (integration) {
      for (const channel of pushChannels) {
        if (!channel.credentials.notificationIdentifiers) continue;
        await this.sendMessage(
          integration,
          channel.credentials.notificationIdentifiers,
          title,
          content,
          command,
          notification,
          command.payload,
          overrides,
          channel.providerId
        );
      }

      return;
    }

    await this.sendErrors(pushChannels, command, notification);
  }

  private async sendErrors(pushChannels, command: SendMessageCommand, notification: NotificationEntity) {
    if (!pushChannels) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Subscriber does not have active channel',
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
    }
  }

  private async sendMessage(
    integration,
    target: string[],
    title: string,
    content: string,
    command: SendMessageCommand,
    notification: NotificationEntity,
    payload: object,
    overrides: object,
    providerId: string
  ) {
    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: command.step.template._id,
      channel: ChannelTypeEnum.PUSH,
      transactionId: command.transactionId,
      notificationIdentifiers: target,
      content,
      title,
      payload: payload as never,
      overrides: overrides as never,
      providerId,
    });

    try {
      const pushHandler = this.pushFactory.getHandler(integration);

      await pushHandler.send({
        target: (overrides as { notificationIdentifiers?: string[] }).notificationIdentifiers || target,
        title,
        content,
        payload,
        overrides,
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
