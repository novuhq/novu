import { Injectable, Logger } from '@nestjs/common';
import { addBreadcrumb } from '@sentry/node';
import { ModuleRef } from '@nestjs/core';

import {
  NotificationStepEntity,
  SubscriberRepository,
  MessageRepository,
  MessageEntity,
  IntegrationEntity,
  IChannelSettings,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  LogCodeEnum,
  ChatProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ProvidersIdEnum,
  ITenantDefine,
} from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  CompileTemplate,
  CompileTemplateCommand,
  ChatFactory,
  SelectIntegration,
  GetNovuProviderCredentials,
  SelectVariant,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '@novu/application-generic';
import { ChatOutput, ExecuteOutput } from '@novu/framework/internal';

import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

const LOG_CONTEXT = 'SendMessageChat';

@Injectable()
export class SendMessageChat extends SendMessageBase {
  channelType = ChannelTypeEnum.CHAT;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected executionLogRoute: ExecutionLogRoute,
    protected moduleRef: ModuleRef
  ) {
    super(
      messageRepository,
      executionLogRoute,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant,
      moduleRef
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    addBreadcrumb({
      message: 'Sending Chat',
    });
    const { step } = command;
    if (!step?.template) throw new PlatformException('Chat channel template not found');

    const { subscriber } = command.compileContext;
    const i18nInstance = await this.initiateTranslations(
      command.environmentId,
      command.organizationId,
      subscriber.locale
    );

    const template = await this.processVariants(command);

    if (template) {
      step.template = template;
    }

    const bridgeOutput = command.bridgeData?.outputs as ChatOutput | undefined;
    let content: string = bridgeOutput?.body || '';

    try {
      if (!command.bridgeData) {
        content = await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: step.template.content as string,
            data: this.getCompilePayload(command.compileContext),
          }),
          i18nInstance
        );
      }
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const chatChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(ChatProviderIdEnum).includes(chan.providerId as ChatProviderIdEnum)
      ) || [];

    const { phone } = subscriber;
    chatChannels.push({
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      credentials: {
        phoneNumber: phone,
      },
    });

    if (chatChannels.length === 0) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    let allFailed = true;
    for (const channel of chatChannels) {
      try {
        await this.sendChannelMessage(command, channel, step, content);
        allFailed = false;
      } catch (e) {
        /*
         * Do nothing, one chat channel failed, perhaps another one succeeds
         * The failed message has been created
         */
        Logger.error(e, `Sending chat message to the chat channel ${channel.providerId} failed`, LOG_CONTEXT);
      }
    }

    if (allFailed) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.CHAT_ALL_CHANNELS_FAILED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );
    }
  }

  private async sendChannelMessage(
    command: SendMessageCommand,
    subscriberChannel: IChannelSettings,
    chatChannel: NotificationStepEntity,
    content: string
  ) {
    const getIntegrationParams: {
      id?: string;
      providerId?: ProvidersIdEnum;
      identifier?: string;
      organizationId: string;
      environmentId: string;
      channelType: ChannelTypeEnum;
      userId: string;
      filterData: {
        tenant: ITenantDefine | undefined;
      };
    } = {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      providerId: subscriberChannel.providerId,
      channelType: ChannelTypeEnum.CHAT,
      userId: command.userId,
      filterData: {
        tenant: command.job.tenant,
      },
    };

    /**
     * Current a workaround as chat providers for whatsapp is more similar to sms than to our chat implementation
     */
    if (subscriberChannel.providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
      getIntegrationParams.id = subscriberChannel._integrationId;
    }

    const integration = await this.getIntegration(getIntegrationParams);

    if (subscriberChannel.providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
      if (!integration) {
        await this.executionLogRoute.execute(
          ExecutionLogRouteCommand.create({
            ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            raw: JSON.stringify({
              reason: `Integration with integrationId: ${subscriberChannel?._integrationId} is either deleted or not active`,
            }),
          })
        );

        return;
      }
    } else if (!integration) {
      /**
       * TODO: Need to handle a proper execution log error for this case
       */
      return;
    }

    const bridgeOverride = this.getBridgeOverride(command.bridgeData?.providers, integration);

    const chatWebhookUrl =
      bridgeOverride?.webhookUrl || command.payload.webhookUrl || subscriberChannel.credentials?.webhookUrl;
    const phoneNumber = subscriberChannel.credentials?.phoneNumber;
    const channelSpecification = subscriberChannel.credentials?.channel;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: chatChannel.template?._id,
      channel: ChannelTypeEnum.CHAT,
      transactionId: command.transactionId,
      chatWebhookUrl,
      phone: phoneNumber,
      content: this.storeContent() ? content : null,
      providerId: subscriberChannel.providerId,
      _jobId: command.jobId,
      tags: command.tags,
    });

    await this.sendSelectedIntegrationExecution(command.job, integration);

    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(content) : null,
      })
    );

    if ((chatWebhookUrl && integration) || (phoneNumber && integration)) {
      await this.sendMessage(chatWebhookUrl, integration, content, message, command, channelSpecification, phoneNumber);

      return;
    }

    await this.sendErrors(chatWebhookUrl, integration, message, command, phoneNumber);
  }

  private getBridgeOverride(
    providersOverrides: ExecuteOutput['providers'],
    integration: IntegrationEntity
  ): Record<string, unknown> | null {
    if (!providersOverrides) {
      return null;
    }

    const providerExists = Object.keys(providersOverrides).includes(integration.providerId);

    if (!providerExists) {
      return null;
    }

    return providersOverrides[integration.providerId];
  }

  private async sendErrors(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    message: MessageEntity,
    command: SendMessageCommand,
    phoneNumber?: string
  ) {
    if (integration?.providerId === ChatProviderIdEnum.WhatsAppBusiness && !phoneNumber) {
      await this.messageRepository.updateMessageStatus(
        command.environmentId,
        message._id,
        'warning',
        null,
        'no_subscriber_chat_phone_number',
        'Subscriber does not have phone number specified'
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.CHAT_MISSING_PHONE_NUMBER,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: `Subscriber does not have a phone number for selected integration`,
          }),
        })
      );
    } else if (!chatWebhookUrl) {
      await this.messageRepository.updateMessageStatus(
        command.environmentId,
        message._id,
        'warning',
        null,
        'no_subscriber_chat_channel_id',
        'Subscriber does not have active chat channel id'
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.CHAT_WEBHOOK_URL_MISSING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: `webhookUrl for integrationId: ${integration?.identifier} is missing`,
          }),
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
        command
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: 'Integration is either deleted or not active',
          }),
        })
      );
    }
  }

  private async sendMessage(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    content: string,
    message: MessageEntity,
    command: SendMessageCommand,
    channelSpecification?: string | undefined,
    phoneNumber?: string | undefined
  ) {
    try {
      const chatFactory = new ChatFactory();
      const chatHandler = chatFactory.getHandler(integration);
      if (!chatHandler) {
        throw new PlatformException(`Chat handler for provider ${integration.providerId} is  not found`);
      }

      const overrides = {
        ...(command.overrides[integration?.channel] || {}),
        ...(command.overrides[integration?.providerId] || {}),
      };
      const bridgeProviderData = command.bridgeData?.providers?.[integration.providerId] || {};

      const result = await chatHandler.send({
        bridgeProviderData,
        phoneNumber,
        customData: overrides,
        webhookUrl: chatWebhookUrl,
        channel: channelSpecification,
        content,
      });

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
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
        e
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
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
