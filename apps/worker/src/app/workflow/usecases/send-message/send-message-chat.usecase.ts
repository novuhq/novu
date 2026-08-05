import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  ChatFactory,
  CompileTemplate,
  CompileTemplateCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  messageWebhookMapper,
  SelectIntegration,
  SelectIntegrationCommand,
  SelectVariant,
  SendWebhookMessage,
  validateEndpointForType,
} from '@novu/application-generic';
import {
  EnvironmentEntity,
  IntegrationEntity,
  MessageEntity,
  MessageRepository,
  NotificationStepEntity,
  OrganizationEntity,
  SubscriberRepository,
  UserEntity,
} from '@novu/dal';
import { ChatOutput } from '@novu/framework/internal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  ENDPOINT_TYPES,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  IChannelSettings,
  ProvidersIdEnum,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
} from '@novu/shared';
import { CardElement, ChannelData, IChatRenderValidation, ISendMessageSuccessResponse } from '@novu/stateless';
import { addBreadcrumb } from '@sentry/node';
import { PlatformException } from '../../../shared/utils';
import { ResolveChannelEndpointsCommand } from './channel-endpoint-resolution/resolve-channel-endpoints.command';
import {
  IntegrationEndpoints,
  ResolveChannelEndpoints,
} from './channel-endpoint-resolution/resolve-channel-endpoints.usecase';
import { combineProviderOverrides, SendMessageBase } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';

const LOG_CONTEXT = 'SendMessageChat';

/**
 * Chat providers that deliver to the subscriber's phone number rather than a webhook/channel.
 * These are auto-resolved from `subscriber.phone` and select their integration by providerId.
 */
const PHONE_BASED_CHAT_PROVIDERS: ChatProviderIdEnum[] = [
  ChatProviderIdEnum.WhatsAppBusiness,
  ChatProviderIdEnum.Sendblue,
];

type UnifiedChannel = {
  type: 'new' | 'legacy';
  data: IntegrationEndpoints | IChannelSettings;
};

type MessageContext = {
  command: SendMessageChannelCommand;
  step: NotificationStepEntity;
  content: string;
  /**
   * Rich Chat: the compiled card (from a Maily block body or a code-first `card` output),
   * resolved once from the bridge output. Its absence keeps the legacy plain-text `content` path.
   */
  card?: CardElement;
  i18nInstance: unknown;
};

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
    protected createExecutionDetails: CreateExecutionDetails,
    protected moduleRef: ModuleRef,
    private sendWebhookMessage: SendWebhookMessage,
    private resolveChannelEndpoints: ResolveChannelEndpoints,
    private featureFlagsService: FeatureFlagsService
  ) {
    super(
      messageRepository,
      createExecutionDetails,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant,
      moduleRef
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageChannelCommand): Promise<SendMessageResult> {
    try {
      // Phase 1: Prepare message context (template processing, content compilation)
      const messageContext = await this.prepareMessageContext(command);

      // Phase 2: Resolve all channels into unified format
      const channels = await this.resolveAllChannels(command);

      if (channels.length === 0) {
        if (command.contextKeys.length > 0) {
          await this.createExecutionDetail(
            command,
            DetailEnum.SUBSCRIBER_CONTEXT_NO_ACTIVE_CHANNEL,
            ExecutionDetailsStatusEnum.WARNING
          );
        } else {
          await this.createExecutionDetail(
            command,
            DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
            ExecutionDetailsStatusEnum.WARNING
          );
        }

        return {
          status: SendMessageStatus.SKIPPED,
          deliveryLifecycleState: {
            status: DeliveryLifecycleStatusEnum.SKIPPED,
            detail: DeliveryLifecycleDetail.USER_MISSING_CREDENTIALS,
          },
        };
      }

      // Phase 3: Send to all channels using unified pipeline
      const status = await this.sendToAllChannels(channels, messageContext);

      // Phase 4: Finalize and return result
      return await this.finalizeResult(command, status);
    } catch (e) {
      if (e instanceof PlatformException && e.message === DetailEnum.MESSAGE_CONTENT_NOT_GENERATED) {
        return {
          status: SendMessageStatus.FAILED,
          errorMessage: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
        };
      }
      throw e;
    }
  }

  /**
   * Prepares the message context by handling template processing, variant resolution, and content compilation
   */
  private async prepareMessageContext(command: SendMessageChannelCommand): Promise<MessageContext> {
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
    const card = bridgeOutput?.card as CardElement | undefined;

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
      throw new PlatformException(DetailEnum.MESSAGE_CONTENT_NOT_GENERATED);
    }

    return { command, step, content, card, i18nInstance };
  }

  /**
   * Resolves all channels (both new and legacy) into a unified format for processing
   */
  private async resolveAllChannels(command: SendMessageChannelCommand): Promise<UnifiedChannel[]> {
    const integrationChannelGroups = await this.getChannelEndpointGroups(command);
    const legacyChatChannels = await this.getLegacyChatChannels(command, integrationChannelGroups);

    const unifiedChannels: UnifiedChannel[] = [];

    // Add new integration channel groups
    for (const integrationGroup of integrationChannelGroups) {
      unifiedChannels.push({
        type: 'new',
        data: integrationGroup,
      });
    }

    // Add legacy channels
    for (const legacyChannel of legacyChatChannels) {
      unifiedChannels.push({
        type: 'legacy',
        data: legacyChannel,
      });
    }

    return unifiedChannels;
  }

  /**
   * Processes all unified channels using a single processing pipeline
   */
  private async sendToAllChannels(
    channels: UnifiedChannel[],
    messageContext: MessageContext
  ): Promise<SendMessageStatus> {
    let status: SendMessageStatus = SendMessageStatus.FAILED;

    for (const channel of channels) {
      try {
        let result: SendMessageResult;

        if (channel.type === 'new') {
          result = await this.sendChannelMessage(
            messageContext.command,
            channel.data as IntegrationEndpoints,
            messageContext.step,
            messageContext.content,
            messageContext.card
          );
        } else {
          result = await this.sendChannelMessageLegacy(
            messageContext.command,
            channel.data as IChannelSettings,
            messageContext.step,
            messageContext.content,
            messageContext.card
          );
        }

        status = this.updateStatus(status, result.status);
      } catch (e) {
        /*
         * Do nothing, one chat channel failed, perhaps another one succeeds
         * The failed message has been created
         */
        const channelId =
          channel.type === 'new'
            ? (channel.data as IntegrationEndpoints).providerId
            : (channel.data as IChannelSettings).providerId;
        Logger.error(e, `Sending chat message to ${channel.type} channel ${channelId} failed`, LOG_CONTEXT);
      }
    }

    return status;
  }

  /**
   * Finalizes the send result by handling final status logic and creating appropriate execution details
   */
  private async finalizeResult(
    command: SendMessageChannelCommand,
    status: SendMessageStatus
  ): Promise<SendMessageResult> {
    if (status === SendMessageStatus.FAILED) {
      await this.createExecutionDetail(command, DetailEnum.CHAT_ALL_CHANNELS_FAILED, ExecutionDetailsStatusEnum.FAILED);

      return {
        status,
        errorMessage: DetailEnum.CHAT_ALL_CHANNELS_FAILED,
      };
    } else if (status === SendMessageStatus.SKIPPED) {
      await this.createExecutionDetail(
        command,
        DetailEnum.CHAT_SOME_CHANNELS_SKIPPED,
        ExecutionDetailsStatusEnum.WARNING
      );

      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatusEnum.SKIPPED,
          detail: DeliveryLifecycleDetail.USER_MISSING_CREDENTIALS,
        },
      };
    }

    return {
      status,
    };
  }

  private async getLegacyChatChannels(
    command: SendMessageChannelCommand,
    channelEndpointGroups: IntegrationEndpoints[] = []
  ): Promise<IChannelSettings[]> {
    const { subscriber } = command.compileContext;

    const chatChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(ChatProviderIdEnum).includes(chan.providerId as ChatProviderIdEnum)
      ) || [];

    /*
     * Phone-based chat providers (WhatsApp Business, Sendblue) deliver to the subscriber's phone
     * number. Auto-resolve a channel from `subscriber.phone` for each such provider that has an
     * active integration, so we only attempt providers the environment is actually configured for.
     * Skip providers that already have a legacy channel OR a new channel-endpoint group — otherwise
     * the same phone number is notified twice (once via endpoints, once via this synthetic channel).
     */
    if (subscriber.phone) {
      const activePhoneProviders = await this.getActivePhoneBasedProviders(command);
      const existingProviderIds = new Set<string>([
        ...chatChannels.map((channel) => channel.providerId),
        ...channelEndpointGroups.map((group) => group.providerId),
      ]);

      for (const providerId of activePhoneProviders) {
        if (existingProviderIds.has(providerId)) continue;

        // @ts-expect-error - Adding a phone-based channel without _integrationId
        chatChannels.push({
          providerId,
          credentials: {
            phoneNumber: subscriber.phone,
          },
        });
      }
    }

    return chatChannels;
  }

  /**
   * Returns the phone-based chat providers that have an active integration selectable for this job,
   * mirroring the selection performed later by {@link getAndValidateIntegration}.
   */
  private async getActivePhoneBasedProviders(command: SendMessageChannelCommand): Promise<ChatProviderIdEnum[]> {
    const results = await Promise.all(
      PHONE_BASED_CHAT_PROVIDERS.map(async (providerId) => {
        const integration = await this.selectIntegration.execute(
          SelectIntegrationCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            channelType: ChannelTypeEnum.CHAT,
            providerId,
            userId: command.userId,
            filterData: {
              tenant: command.job.tenant,
            },
          })
        );

        return integration ? providerId : null;
      })
    );

    return results.filter((providerId): providerId is ChatProviderIdEnum => providerId !== null);
  }

  /**
   * Sends one message to multiple endpoints per integration (fanout)
   */
  private async sendChannelMessage(
    command: SendMessageChannelCommand,
    integrationChannelData: IntegrationEndpoints,
    step: NotificationStepEntity,
    content: string,
    card?: CardElement
  ): Promise<SendMessageResult> {
    const { integration, error } = await this.getAndValidateIntegration(
      command,
      integrationChannelData.providerId,
      undefined,
      integrationChannelData.integrationIdentifier
    );
    if (error) return error;

    const message = await this.createMessage(
      command,
      step,
      content,
      integrationChannelData.providerId,
      integration,
      {},
      integrationChannelData.channelData
    );

    let status: SendMessageStatus = SendMessageStatus.FAILED;

    for (const channelData of integrationChannelData.channelData) {
      try {
        const result = await this.sendMessage(channelData, integration, content, card, message, command);

        if (result.status === SendMessageStatus.SUCCESS) {
          status = SendMessageStatus.SUCCESS;
        }
      } catch (e) {
        Logger.error(e, 'Failed to send chat message', LOG_CONTEXT);
      }
    }

    if (status === SendMessageStatus.SUCCESS) {
      return { status };
    }

    return {
      status: SendMessageStatus.FAILED,
      errorMessage: DetailEnum.PROVIDER_ERROR,
    };
  }

  /**
   * @deprecated - this method handles sending to legacy chat channels
   * sends 1 message per integration (no fanout to multiple endpoints)
   */
  private async sendChannelMessageLegacy(
    command: SendMessageChannelCommand,
    subscriberChannel: IChannelSettings,
    step: NotificationStepEntity,
    content: string,
    card?: CardElement
  ): Promise<SendMessageResult> {
    /**
     * Workaround: phone-based chat providers (WhatsApp, Sendblue) behave more like SMS than our
     * webhook-based chat implementation, so they select their integration by providerId rather
     * than by the subscriber channel's _integrationId (which is absent on auto-resolved channels).
     */
    const integrationId = PHONE_BASED_CHAT_PROVIDERS.includes(subscriberChannel.providerId as ChatProviderIdEnum)
      ? undefined
      : subscriberChannel._integrationId;

    const { integration, error } = await this.getAndValidateIntegration(
      command,
      subscriberChannel.providerId,
      integrationId,
      undefined
    );
    if (error) return error;

    const combinedOverrides = combineProviderOverrides(
      command.bridgeData,
      command.overrides,
      command.step.stepId,
      integration.providerId
    );

    const chatWebhookUrl =
      combinedOverrides?.webhookUrl || command.payload.webhookUrl || subscriberChannel.credentials?.webhookUrl;
    const phoneNumber = subscriberChannel.credentials?.phoneNumber;

    // transform the legacy channel (chatWebhookUrl, phoneNumber, channelSpecification) to new channelData interface
    const channelData = this.buildLegacyChannelData(subscriberChannel, combinedOverrides, command);

    const message = await this.createMessage(
      command,
      step,
      content,
      subscriberChannel.providerId,
      integration,
      {
        chatWebhookUrl,
        phone: phoneNumber,
      },
      channelData ? [channelData] : undefined
    );

    if (channelData) {
      return await this.sendMessage(channelData, integration, content, card, message, command);
    }

    return await this.sendErrors(chatWebhookUrl, integration, message, command, phoneNumber);
  }

  private buildLegacyChannelData(
    subscriberChannel: IChannelSettings,
    combinedOverrides: Record<string, unknown> | null,
    command: SendMessageChannelCommand
  ): ChannelData | null {
    const chatWebhookUrl =
      combinedOverrides?.webhookUrl || command.payload.webhookUrl || subscriberChannel.credentials?.webhookUrl;

    const phoneNumber = subscriberChannel.credentials?.phoneNumber;
    const channelSpecification = subscriberChannel.credentials?.channel;

    if (chatWebhookUrl) {
      return {
        identifier: '-',
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: chatWebhookUrl,
          ...(channelSpecification && { channel: channelSpecification }),
        },
      };
    }

    if (phoneNumber) {
      return {
        identifier: '-',
        type: ENDPOINT_TYPES.PHONE,
        endpoint: { phoneNumber },
      };
    }

    return null;
  }

  private async getChannelEndpointGroups(command: SendMessageChannelCommand): Promise<IntegrationEndpoints[]> {
    return this.resolveChannelEndpoints.execute(
      ResolveChannelEndpointsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        subscriberId: command.subscriberId,
        channelType: ChannelTypeEnum.CHAT,
        contextKeys: command.contextKeys,
      })
    );
  }

  private async sendErrors(
    chatWebhookUrl: string,
    integration: IntegrationEntity,
    message: MessageEntity,
    command: SendMessageChannelCommand,
    phoneNumber?: string
  ): Promise<SendMessageResult> {
    if (integration?.providerId === ChatProviderIdEnum.WhatsAppBusiness && !phoneNumber) {
      return await this.handleMissingResourceError(
        command,
        message,
        DetailEnum.CHAT_MISSING_PHONE_NUMBER,
        DeliveryLifecycleDetail.USER_MISSING_PHONE,
        'no_subscriber_chat_phone_number',
        'Subscriber does not have phone number specified',
        'Subscriber does not have a phone number for selected integration'
      );
    }

    if (!chatWebhookUrl) {
      return await this.handleMissingResourceError(
        command,
        message,
        DetailEnum.CHAT_WEBHOOK_URL_MISSING,
        DeliveryLifecycleDetail.USER_MISSING_WEBHOOK_URL,
        'no_subscriber_chat_channel_id',
        'Subscriber does not have active chat channel id',
        `webhookUrl for integrationId: ${integration?.identifier} is missing`
      );
    }

    if (!integration) {
      Logger.warn(
        {
          hasChatWebhookUrl: Boolean(chatWebhookUrl),
          hasPhoneNumber: Boolean(phoneNumber),
          messageId: String(message?._id ?? ''),
        },
        `${LOG_CONTEXT} — sendErrors: missing integration (unexpected if getAndValidateIntegration succeeded)`
      );

      await this.sendErrorStatus(
        message,
        'warning',
        'chat_missing_integration_error',
        'Subscriber does not have an active chat integration',
        command
      );

      await this.createExecutionDetail(
        command,
        DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
        ExecutionDetailsStatusEnum.FAILED,
        message._id,
        'Integration is either deleted or not active'
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
      };
    }

    return {
      status: SendMessageStatus.FAILED,
      errorMessage: DetailEnum.PROVIDER_ERROR,
    };
  }

  private async sendMessage(
    channelData: ChannelData,
    integration: IntegrationEntity,
    content: string,
    card: CardElement | undefined,
    message: MessageEntity,
    command: SendMessageChannelCommand
  ): Promise<SendMessageResult> {
    const chatHandler = this.setupChatHandler(integration);
    const overrides = this.buildMessageOverrides(command, integration);

    const combinedOverrides = combineProviderOverrides(
      command.bridgeData,
      command.overrides,
      command.step.stepId,
      integration.providerId
    );

    // Apply channel data overrides if present for this specific endpoint
    const overriddenChannelData = this.applyEndpointSpecificOverrides(channelData, combinedOverrides);

    try {
      // Rich Chat: resolve the compiled card into transport-ready fields once, here — before
      // `send` — so the provider stays a pure transport and the editor preview can reuse the
      // same `render()`. Gated by `IS_CHAT_BLOCK_EDITOR_ENABLED`; when off, the legacy plain-text
      // `content` path is used unchanged.
      let messageContent = content;
      let nativePayload: Record<string, unknown> | undefined;
      const isRichChatEnabled = await this.isRichChatEnabled(command);

      if (card && isRichChatEnabled) {
        const resolved = await chatHandler.resolveCardContent(card);
        messageContent = resolved.content;
        nativePayload = resolved.nativePayload;
        this.logCardRenderWarnings(resolved.validation, command);
      }

      const result = await chatHandler.send({
        channelData: overriddenChannelData,
        bridgeProviderData: combinedOverrides,
        customData: overrides,
        content: messageContent,
        nativePayload,
      });

      return await this.handleMessageSendSuccess(result, message, command, overriddenChannelData);
    } catch (error) {
      return await this.handleMessageSendError(error, message, command, overriddenChannelData);
    }
  }

  private async isRichChatEnabled(command: SendMessageChannelCommand): Promise<boolean> {
    return await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CHAT_BLOCK_EDITOR_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId } as EnvironmentEntity,
      organization: { _id: command.organizationId } as OrganizationEntity,
      user: { _id: command.userId } as UserEntity,
    });
  }

  /**
   * Rich Chat: surface the deterministic, non-blocking post-render platform-limit warnings
   * (e.g. Slack block/char caps) produced while resolving the card into the execution log.
   */
  private logCardRenderWarnings(validation: IChatRenderValidation[], command: SendMessageChannelCommand): void {
    if (validation.length === 0) {
      return;
    }

    Logger.warn(
      { jobId: command.jobId, warnings: validation },
      `Chat card render produced ${validation.length} platform-limit warning(s)`,
      LOG_CONTEXT
    );
  }

  private updateStatus(currentStatus: SendMessageStatus, newStatus: SendMessageStatus): SendMessageStatus {
    if (newStatus === SendMessageStatus.SUCCESS) {
      return SendMessageStatus.SUCCESS;
    } else if (newStatus === SendMessageStatus.SKIPPED && currentStatus !== SendMessageStatus.SUCCESS) {
      return SendMessageStatus.SKIPPED;
    }
    return currentStatus;
  }

  private async createMessage(
    command: SendMessageChannelCommand,
    step: NotificationStepEntity,
    content: string,
    providerId: ProvidersIdEnum,
    integration: IntegrationEntity,
    additionalFields: Partial<MessageEntity> = {},
    channelData?: ChannelData[]
  ): Promise<MessageEntity> {
    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: step.template?._id,
      channel: ChannelTypeEnum.CHAT,
      transactionId: command.transactionId,
      content: this.storeContent() ? content : null,
      providerId,
      _jobId: command.jobId,
      tags: command.tags,
      severity: command.severity,
      stepId: command.step.stepId,
      contextKeys: command.contextKeys,
      ...(channelData &&
        channelData.length > 0 && { channelData: channelData.map((data) => this.redactChannelData(data)) }),
      ...additionalFields,
    });

    await this.sendSelectedIntegrationExecution(command.job, integration);

    await this.createExecutionDetail(
      command,
      DetailEnum.MESSAGE_CREATED,
      ExecutionDetailsStatusEnum.PENDING,
      message._id,
      this.storeContent() ? content : null
    );

    return message;
  }

  private async getAndValidateIntegration(
    command: SendMessageChannelCommand,
    providerId: ProvidersIdEnum,
    integrationId?: string,
    integrationIdentifier?: string
  ): Promise<{ integration: IntegrationEntity; error?: never } | { integration?: never; error: SendMessageResult }> {
    const getIntegrationParams = {
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      providerId,
      channelType: ChannelTypeEnum.CHAT,
      userId: command.userId,
      filterData: {
        tenant: command.job.tenant,
      },
      ...(integrationId && { id: integrationId }),
      ...(integrationIdentifier && { identifier: integrationIdentifier }),
    };

    const integration = await this.getIntegration(getIntegrationParams);

    if (!integration) {
      const reason = integrationIdentifier
        ? `Integration with integrationIdentifier: ${integrationIdentifier} is either deleted or not active`
        : integrationId
          ? `Integration with integrationId: ${integrationId} is either deleted or not active`
          : `Integration is either deleted or not active`;

      Logger.warn(
        {
          reason,
          providerId,
          hasIntegrationId: Boolean(integrationId),
          hasIntegrationIdentifier: Boolean(integrationIdentifier),
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          jobId: String(command.job?._id ?? ''),
          hasJobTenant: Boolean(command.job.tenant),
        },
        `${LOG_CONTEXT} — getAndValidateIntegration: no integration from SelectIntegration`
      );

      await this.createExecutionDetail(
        command,
        DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
        ExecutionDetailsStatusEnum.FAILED,
        undefined,
        reason
      );

      return {
        error: {
          status: SendMessageStatus.FAILED,
          errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
        },
      };
    }

    return { integration };
  }

  private async createExecutionDetail(
    command: SendMessageChannelCommand,
    detail: DetailEnum,
    status: ExecutionDetailsStatusEnum,
    messageId?: string,
    rawData?: Record<string, unknown> | string | null
  ): Promise<void> {
    const rawValue = rawData ? (typeof rawData === 'string' ? rawData : JSON.stringify(rawData)) : undefined;

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        ...(messageId && { messageId }),
        detail,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status,
        isTest: false,
        isRetry: false,
        ...(rawValue && { raw: rawValue }),
      })
    );
  }

  private redactChannelData(channelData: ChannelData): ChannelData {
    return {
      ...channelData,
      ...('token' in channelData && channelData.token && { token: `${channelData.token.slice(0, 8)}...` }),
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private getErrorResponseData(error: unknown): Record<string, unknown> {
    if (error && typeof error === 'object' && 'response' in error) {
      const errorWithResponse = error as { response?: { data?: unknown } };
      const responseData = errorWithResponse.response?.data;
      return responseData ? { responseData } : {};
    }
    return {};
  }

  private setupChatHandler(integration: IntegrationEntity) {
    const chatFactory = new ChatFactory();
    const chatHandler = chatFactory.getHandler(integration);

    if (!chatHandler) {
      throw new PlatformException(`Chat handler for provider ${integration.providerId} is  not found`);
    }

    return chatHandler;
  }

  private buildMessageOverrides(command: SendMessageChannelCommand, integration: IntegrationEntity) {
    return {
      ...(integration?.channel ? command.overrides[integration.channel] || {} : {}),
      ...(command.overrides[integration?.providerId] || {}),
    };
  }

  private applyEndpointSpecificOverrides<T extends ChannelData>(
    originalChannelData: T,
    combinedOverrides: Record<string, unknown>
  ): T {
    const { identifier, type } = originalChannelData;

    // Early returns for invalid cases
    if (!identifier) return originalChannelData;

    const endpointOverrides = combinedOverrides[identifier];
    if (!endpointOverrides || typeof endpointOverrides !== 'object') {
      return originalChannelData;
    }

    const newEndpoint = (endpointOverrides as Record<string, unknown>).endpoint;
    if (!newEndpoint || typeof newEndpoint !== 'object') {
      return originalChannelData;
    }

    // Validate the new endpoint against the channel type schema
    try {
      validateEndpointForType(type, newEndpoint as Record<string, unknown>);

      return {
        ...originalChannelData,
        endpoint: newEndpoint as T['endpoint'],
      };
    } catch (_error) {
      // ignoring the override since it's invalid
      return originalChannelData;
    }
  }

  private async handleMessageSendSuccess(
    result: ISendMessageSuccessResponse,
    message: MessageEntity,
    command: SendMessageChannelCommand,
    channelData: ChannelData
  ): Promise<SendMessageResult> {
    const redactedChannelData = this.redactChannelData(channelData);

    await this.createExecutionDetail(
      command,
      DetailEnum.MESSAGE_SENT,
      ExecutionDetailsStatusEnum.SUCCESS,
      message._id,
      {
        ...result,
        channelData: redactedChannelData,
      }
    );

    await this.sendWebhookMessage.execute({
      eventType: WebhookEventEnum.MESSAGE_SENT,
      objectType: WebhookObjectTypeEnum.MESSAGE,
      payload: {
        object: messageWebhookMapper(message, command.subscriberId, {
          providerResponseId: result.id,
          // for backwards compatibility
          webhookUrl: channelData.type === ENDPOINT_TYPES.WEBHOOK ? channelData.endpoint.url : undefined,
          channelData: redactedChannelData,
        }),
      },
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    return {
      status: SendMessageStatus.SUCCESS,
    };
  }

  private async handleMessageSendError(
    error: unknown,
    message: MessageEntity,
    command: SendMessageChannelCommand,
    channelData: ChannelData
  ): Promise<SendMessageResult> {
    const redactedChannelData = this.redactChannelData(channelData);

    await this.sendErrorStatus(
      message,
      'error',
      'unexpected_chat_error',
      this.getErrorMessage(error) || 'Un-expect CHAT provider error',
      command,
      error
    );

    await this.createExecutionDetail(
      command,
      DetailEnum.PROVIDER_ERROR,
      ExecutionDetailsStatusEnum.FAILED,
      message._id,
      {
        channelData: redactedChannelData,
        message: this.getErrorMessage(error),
        ...this.getErrorResponseData(error),
      }
    );

    await this.sendWebhookMessage.execute({
      eventType: WebhookEventEnum.MESSAGE_SENT,
      objectType: WebhookObjectTypeEnum.MESSAGE,
      payload: {
        object: messageWebhookMapper(message, command.subscriberId, {
          channelData: redactedChannelData,
        }),
        error: {
          message: this.getErrorMessage(error) || 'Error while sending chat with provider',
        },
      },
      organizationId: command.organizationId,
      environmentId: command.environmentId,
    });

    return {
      status: SendMessageStatus.FAILED,
      errorMessage: DetailEnum.PROVIDER_ERROR,
    };
  }

  private async handleMissingResourceError(
    command: SendMessageChannelCommand,
    message: MessageEntity,
    detail: DetailEnum,
    lifecycleDetail: DeliveryLifecycleDetail,
    messageStatusKey: string,
    messageStatusDescription: string,
    reason: string
  ): Promise<SendMessageResult> {
    await this.messageRepository.updateMessageStatus(
      command.environmentId,
      message._id,
      'warning',
      null,
      messageStatusKey,
      messageStatusDescription
    );

    await this.createExecutionDetail(command, detail, ExecutionDetailsStatusEnum.FAILED, message._id, reason);

    return {
      status: SendMessageStatus.SKIPPED,
      deliveryLifecycleState: {
        status: DeliveryLifecycleStatusEnum.SKIPPED,
        detail: lifecycleDetail,
      },
    };
  }
}
