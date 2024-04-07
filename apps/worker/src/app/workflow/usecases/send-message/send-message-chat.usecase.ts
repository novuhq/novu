import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
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
  IProviderOverride,
  IProvidersOverride,
  ExecuteOutput,
  IChimeraChannelResponse,
  IBlock,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
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
    protected createLogUsecase: CreateLog,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected executionLogRoute: ExecutionLogRoute,
    protected moduleRef: ModuleRef
  ) {
    super(
      messageRepository,
      createLogUsecase,
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
    Sentry.addBreadcrumb({
      message: 'Sending Chat',
    });
    const step: NotificationStepEntity = command.step;
    if (!step?.template) throw new PlatformException('Chat channel template not found');

    const { subscriber } = command.compileContext;
    await this.initiateTranslations(command.environmentId, command.organizationId, subscriber.locale);

    const template = await this.processVariants(command);

    if (template) {
      step.template = template;
    }

    let content = '';

    try {
      if (!command.chimeraData) {
        content = await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: step.template.content as string,
            data: this.getCompilePayload(command.compileContext),
          })
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
    const integration = await this.getIntegration({
      id: subscriberChannel._integrationId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      providerId: subscriberChannel.providerId,
      channelType: ChannelTypeEnum.CHAT,
      userId: command.userId,
      filterData: {
        tenant: command.job.tenant,
      },
    });

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

    const chimeraOverride = this.getChimeraOverride(command.chimeraData?.providers, integration);

    const chatWebhookUrl =
      chimeraOverride?.webhookUrl || command.payload.webhookUrl || subscriberChannel.credentials?.webhookUrl;
    const channelSpecification = subscriberChannel.credentials?.channel;

    if (!chatWebhookUrl) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.CHAT_WEBHOOK_URL_MISSING,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: `webhookUrl for integrationId: ${subscriberChannel?._integrationId} is missing`,
          }),
        })
      );
    }

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: chatChannel.template?._id,
      channel: ChannelTypeEnum.CHAT,
      transactionId: command.transactionId,
      chatWebhookUrl: chatWebhookUrl,
      content: this.storeContent() ? content : null,
      providerId: subscriberChannel.providerId,
      _jobId: command.jobId,
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

    if (chatWebhookUrl && integration) {
      await this.sendMessage(chatWebhookUrl, integration, content, message, command, channelSpecification);

      return;
    }

    await this.sendErrors(chatWebhookUrl, integration, message, command);
  }

  private getChimeraOverride(
    providersOverrides: IProvidersOverride | undefined,
    integration: IntegrationEntity
  ): IProviderOverride | null {
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
    command: SendMessageCommand
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
        command,
        LogCodeEnum.MISSING_CHAT_INTEGRATION
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

      return;
    }
  }

  private async sendMessage(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    content: string,
    message: MessageEntity,
    command: SendMessageCommand,
    channelSpecification?: string | undefined
  ) {
    try {
      const chatFactory = new ChatFactory();
      const chatHandler = chatFactory.getHandler(integration);
      if (!chatHandler) {
        throw new PlatformException(`Chat handler for provider ${integration.providerId} is  not found`);
      }

      const chimeraContent = this.getOverrideContent(command.chimeraData, integration);

      const result = await chatHandler.send({
        webhookUrl: chatWebhookUrl,
        channel: channelSpecification,
        ...(chimeraContent?.content ? (chimeraContent as DefinedContent) : { content }),
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
        LogCodeEnum.CHAT_ERROR,
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

  private getOverrideContent(
    chimeraData: ExecuteOutput<IChimeraChannelResponse> | undefined | null,
    integration: IntegrationEntity
  ): { content: string | undefined; blocks: IBlock[] | undefined } | { content: string | undefined } {
    const chimeraProviderOverride = this.getChimeraOverride(chimeraData?.providers, integration);

    let chimeraContent: { content: string | undefined; blocks: IBlock[] | undefined } | { content: string | undefined };
    if (chimeraProviderOverride) {
      chimeraContent = { content: chimeraProviderOverride.text, blocks: chimeraProviderOverride.blocks };
    } else {
      chimeraContent = { content: chimeraData?.outputs.body };
    }

    return chimeraContent;
  }
}

type DefinedContent = { content: string; blocks: IBlock[] | undefined } | { content: string };
