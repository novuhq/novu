import { Injectable } from '@nestjs/common';
import { SendMessageType } from './send-message-type.usecase';
import { ChatFactory } from '../../services/chat-service/chat.factory';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { SendMessageCommand } from './send-message.command';
import * as Sentry from '@sentry/node';
import {
  IntegrationRepository,
  NotificationRepository,
  NotificationStepEntity,
  SubscriberEntity,
  SubscriberRepository,
  MessageRepository,
  MessageEntity,
  NotificationEntity,
} from '@novu/dal';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum, ChatProviderIdEnum } from '@novu/shared';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { CompileTemplate } from '../../../content-templates/usecases/compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../../../content-templates/usecases/compile-template/compile-template.command';

@Injectable()
export class SendMessageChat extends SendMessageType {
  private chatFactory = new ChatFactory();

  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    private integrationRepository: IntegrationRepository,
    private compileTemplate: CompileTemplate
  ) {
    super(messageRepository, createLogUsecase);
  }

  public async execute(command: SendMessageCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending Chat',
    });
    const chatChannel: NotificationStepEntity = command.step;
    const notification = await this.notificationRepository.findById(command.notificationId);
    const subscriber: SubscriberEntity = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.subscriberId,
    });
    const content = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: chatChannel.template.content as string,
        data: {
          subscriber,
          step: {
            digest: !!command.events.length,
            events: command.events,
            total_count: command.events.length,
          },
          ...command.payload,
        },
      })
    );

    const chatChannels = subscriber.channels.filter((chan) =>
      Object.values(ChatProviderIdEnum).includes(chan.providerId as ChatProviderIdEnum)
    );

    for (const channel of chatChannels) {
      await this.sendChannelMessage(command, channel, notification, chatChannel, content);
    }
  }

  private async sendChannelMessage(
    command: SendMessageCommand,
    subscriberChannel,
    notification,
    chatChannel,
    content: string
  ) {
    const chatWebhookUrl = command.payload.webhookUrl || subscriberChannel.credentials.webhookUrl;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: chatChannel.template._id,
      channel: ChannelTypeEnum.CHAT,
      transactionId: command.transactionId,
      chatWebhookUrl: chatWebhookUrl,
      content,
      providerId: subscriberChannel.providerId,
    });

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      providerId: subscriberChannel.providerId,
      channel: ChannelTypeEnum.CHAT,
      active: true,
    });

    if (chatWebhookUrl && integration) {
      await this.sendMessage(chatWebhookUrl, integration, content, message, command, notification);

      return;
    }

    await this.sendErrors(chatWebhookUrl, integration, message, command, notification);
  }

  private async sendErrors(
    chatWebhookUrl,
    integration,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    if (!chatWebhookUrl) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Subscriber does not have active chat channel Id',
          userId: command.userId,
          subscriberId: command.subscriberId,
          code: LogCodeEnum.SUBSCRIBER_MISSING_CHAT_CHANNEL_ID,
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
        'no_subscriber_chat_channel_id',
        'Subscriber does not have active chat channel id'
      );
    }
    if (!integration) {
      await this.sendErrorStatus(
        message,
        'warning',
        'chat_missing_integration_error',
        'Subscriber does not have an active chat integration',
        command,
        notification,
        LogCodeEnum.MISSING_CHAT_INTEGRATION
      );
    }
  }

  private async sendMessage(
    chatWebhookUrl,
    integration,
    content,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    try {
      const chatHandler = this.chatFactory.getHandler(integration);

      await chatHandler.send({
        webhookUrl: chatWebhookUrl,
        content,
      });
    } catch (e) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: e.message || e.name || 'Un-expect CHAT provider error',
          userId: command.userId,
          code: LogCodeEnum.CHAT_ERROR,
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
        'unexpected_chat_error',
        e.message || e.name || 'Un-expect CHAT provider error'
      );
    }
  }
}
