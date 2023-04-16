import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  NotificationRepository,
  NotificationStepEntity,
  SubscriberRepository,
  MessageRepository,
  MessageEntity,
  NotificationEntity,
  IntegrationEntity,
  IChannelSettings,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  LogCodeEnum,
  ChatProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
  CompileTemplate,
  CompileTemplateCommand,
  ChatFactory,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils/exceptions';

@Injectable()
export class SendMessageChat extends SendMessageBase {
  channelType = ChannelTypeEnum.CHAT;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileTemplate: CompileTemplate,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {
    super(
      messageRepository,
      createLogUsecase,
      createExecutionDetails,
      subscriberRepository,
      getDecryptedIntegrationsUsecase
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const subscriber = await this.getSubscriberBySubscriberId({
      subscriberId: command.subscriberId,
      _environmentId: command.environmentId,
    });
    if (!subscriber) throw new PlatformException('Subscriber not found');

    Sentry.addBreadcrumb({
      message: 'Sending Chat',
    });
    const chatChannel: NotificationStepEntity = command.step;
    if (!chatChannel || !chatChannel.template) throw new PlatformException('Chat channel template not found');

    const notification = await this.notificationRepository.findById(command.notificationId);

    let content = '';
    const data = {
      subscriber: subscriber,
      step: {
        digest: !!command.events?.length,
        events: command.events,
        total_count: command.events?.length,
      },
      ...command.payload,
    };

    try {
      content = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: chatChannel.template.content as string,
          data,
        })
      );
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const chatChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(ChatProviderIdEnum).includes(chan.providerId as ChatProviderIdEnum)
      ) || [];

    if (chatChannels.length === 0) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    for (const channel of chatChannels) {
      await this.sendChannelMessage(command, channel, notification, chatChannel, content);
    }
  }

  private async sendChannelMessage(
    command: SendMessageCommand,
    subscriberChannel: IChannelSettings,
    notification,
    chatChannel,
    content: string
  ) {
    const integration = await this.getIntegration(
      GetDecryptedIntegrationsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        providerId: subscriberChannel.providerId,
        channelType: ChannelTypeEnum.CHAT,
        findOne: true,
        active: true,
        userId: command.userId,
      })
    );

    const chatWebhookUrl = command.payload.webhookUrl || subscriberChannel.credentials?.webhookUrl;
    const channelSpecification = subscriberChannel.credentials?.channel;

    if (!chatWebhookUrl) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.CHAT_WEBHOOK_URL_MISSING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );
    }

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: chatChannel.template._id,
      channel: ChannelTypeEnum.CHAT,
      transactionId: command.transactionId,
      chatWebhookUrl: chatWebhookUrl,
      content: this.storeContent() ? content : null,
      providerId: subscriberChannel.providerId,
      _jobId: command.jobId,
    });

    if (!integration) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(content) : null,
      })
    );

    if (chatWebhookUrl && integration) {
      await this.sendMessage(
        chatWebhookUrl,
        integration,
        content,
        message,
        command,
        notification,
        channelSpecification
      );

      return;
    }

    await this.sendErrors(chatWebhookUrl, integration, message, command, notification);
  }

  private async sendErrors(
    chatWebhookUrl,
    integration: IntegrationEntity,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    if (!chatWebhookUrl) {
      await this.messageRepository.updateMessageStatus(
        command.environmentId,
        message._id,
        'warning',
        null,
        'no_subscriber_chat_channel_id',
        'Subscriber does not have active chat channel id'
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
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
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }
  }

  private async sendMessage(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    content: string,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity,
    channelSpecification?: string | undefined
  ) {
    try {
      const chatFactory = new ChatFactory();
      const chatHandler = chatFactory.getHandler(integration);
      if (!chatHandler) {
        throw new PlatformException(`Chat handler for provider ${integration.providerId} is  not found`);
      }

      const result = await chatHandler.send({
        webhookUrl: chatWebhookUrl,
        channel: channelSpecification,
        content,
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.MESSAGE_SENT,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(result),
        })
      );
    } catch (e) {
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_chat_error',
        e.message || e.name || 'Un-expect CHAT provider error',
        command,
        notification,
        LogCodeEnum.CHAT_ERROR,
        e
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(e),
        })
      );
    }
  }
}
