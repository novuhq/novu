import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  buildSubscriberKey,
  CompileTemplate,
  CompileTemplateCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  InvalidateCacheService,
  IPushHandler,
  messageWebhookMapper,
  PushFactory,
  SelectIntegration,
  SelectVariant,
  SendWebhookMessage,
} from '@novu/application-generic';
import {
  IntegrationEntity,
  JobEntity,
  MessageEntity,
  MessageRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { PushOutput } from '@novu/framework/internal';
import {
  ChannelTypeEnum,
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  IChannelSettings,
  InboxCountTypeEnum,
  ProvidersIdEnum,
  PushProviderIdEnum,
  safeJsonStringify,
  TriggerOverrides,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
} from '@novu/shared';
import { IPushOptions } from '@novu/stateless';
import { addBreadcrumb } from '@sentry/node';
import { merge } from 'lodash';
import { PlatformException } from '../../../shared/utils';
import { SendMessageBase } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';

const LOG_CONTEXT = 'SendMessagePush';

export const SUBSCRIBER_ERROR_PATTERNS: string[] = [
  'NotRegistered',
  'InvalidRegistration',
  'MismatchSenderId',
  'Unregistered',
  'BadDeviceToken',
  'DeviceTokenNotForTopic',
  'ExpiredPushToken',
  'InvalidProviderToken',
  'Requested entity was not found',
  'SenderId mismatch',
  'Make sure you have provided a server key as directed by the Expo FCM documentation',
  'is not a valid Expo push token',
  'The registration token is not a valid FCM registration token',
];

export function isSubscriberError(errorMessage: string): boolean {
  return SUBSCRIBER_ERROR_PATTERNS.some((pattern) => errorMessage.includes(pattern));
}

/** Safe for Axios / Node errors that may contain circular socket references. */
export function serializePushProviderError(error: unknown): string {
  const serialized = safeJsonStringify(error);

  if (serialized !== '{}') {
    return serialized;
  }

  if (error instanceof Error) {
    return JSON.stringify({ message: error.message, name: error.name });
  }

  return JSON.stringify({ message: String(error ?? '') });
}

interface IPushProviderOverride {
  providerId: PushProviderIdEnum;
  overrides: Record<string, unknown>;
}

@Injectable()
export class SendMessagePush extends SendMessageBase {
  channelType = ChannelTypeEnum.PUSH;
  private pushProviderIds: PushProviderIdEnum[] = Object.values(PushProviderIdEnum);

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef,
    private sendWebhookMessage: SendWebhookMessage,
    private invalidateCache: InvalidateCacheService,
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
    addBreadcrumb({
      message: 'Sending Push',
    });

    const { step } = command;
    const { subscriber, step: stepData } = command.compileContext;

    const template = await this.processVariants(command);
    const i18nInstance = await this.initiateTranslations(
      command.environmentId,
      command.organizationId,
      subscriber.locale
    );

    if (template) {
      step.template = template;
    }

    const data = this.getCompilePayload(command.compileContext);
    let content = '';
    let title = '';

    try {
      if (!command.bridgeData) {
        content = await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: step.template?.content as string,
            data,
          }),
          i18nInstance
        );

        title = await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: step.template?.title as string,
            data,
          }),
          i18nInstance
        );
      }
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
      };
    }

    const pushChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(PushProviderIdEnum).includes(chan.providerId as PushProviderIdEnum)
      ) || [];

    const pushProviderOverrides = this.getPushProviderOverrides(command.overrides, command.step?.stepId || '');
    const providersWithCredentialOverrides = this.filterProvidersWithCredentialOverrides(pushProviderOverrides);

    const channelsFromOverrides = await this.constructChannelSettingsFromOverrides(
      providersWithCredentialOverrides,
      command
    );
    const existingProviderIds = pushChannels.map((channel) => channel.providerId);
    const uniqueOverrideChannels = channelsFromOverrides.filter(
      (channel) => !existingProviderIds.includes(channel.providerId)
    );
    const allPushChannels = [...pushChannels, ...uniqueOverrideChannels];

    if (!allPushChannels.length) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.WARNING,
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatusEnum.SKIPPED,
          detail: DeliveryLifecycleDetail.USER_MISSING_PUSH_TOKEN,
        },
      };
    }

    const messagePayload = { ...command.payload };
    delete messagePayload.attachments;

    let status: SendMessageResult['status'] = SendMessageStatus.FAILED;
    for (const channel of allPushChannels) {
      const { deviceTokens } = channel.credentials || {};

      const isChannelMissingDeviceTokens = await this.isChannelMissingDeviceTokens(channel);
      if (isChannelMissingDeviceTokens && !deviceTokens && !uniqueOverrideChannels?.length) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.PUSH_MISSING_DEVICE_TOKENS,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            providerId: channel.providerId,
            raw: JSON.stringify(channel),
          })
        );

        if (status !== SendMessageStatus.SUCCESS) {
          status = SendMessageStatus.SKIPPED;
        }
      }

      let integration: IntegrationEntity | undefined;
      try {
        integration = await this.getSubscriberIntegration(channel, command);
      } catch (error) {
        Logger.error(
          { jobId: command.jobId },
          `Unexpected error while processing channel for jobId ${command.jobId} ${error.message || error.toString()}`,
          LOG_CONTEXT
        );
        continue;
      }

      const noDeviceTokensAndNoOverrides = !deviceTokens && !uniqueOverrideChannels?.length;
      // We avoid to send a message if subscriber has not an integration or if the subscriber has no device tokens for said integration
      if (noDeviceTokensAndNoOverrides || !integration) {
        continue;
      }

      let overrides: Record<string, unknown> = command.overrides[integration.providerId] || {};
      const target = (overrides as { deviceTokens?: string[] }).deviceTokens || deviceTokens;

      await this.sendSelectedIntegrationExecution(command.job, integration);

      const isPushUnreadCountEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_PUSH_UNREAD_COUNT_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
        user: { _id: command.userId },
        environment: { _id: command.environmentId },
      });

      const inboxCountType = integration?.configurations?.inboxCount;
      if (isPushUnreadCountEnabled && inboxCountType && inboxCountType !== InboxCountTypeEnum.NONE) {
        overrides = await this.updateOverridesWithInboxUnreadCount(command, overrides, subscriber, inboxCountType);
      }

      /**
       * There are no targets available for the subscriber, but credentials provided in the overrides
       */
      if (!target?.length && uniqueOverrideChannels?.length) {
        const message = await this.createMessage({
          command,
          integration,
          title,
          content,
          deviceTokens: target,
          overrides,
        });

        const result = await this.sendMessage(
          command,
          message,
          subscriber,
          integration,

          // credentials provided in the overrides
          '',
          title,
          content,
          overrides,
          stepData
        );

        if (result.success) {
          status = SendMessageStatus.SUCCESS;
        } else {
          const errorMessage = result.error.message || result.error.toString();
          const logMethod = isSubscriberError(errorMessage) ? 'debug' : 'error';
          Logger[logMethod](
            { jobId: command.jobId },
            `Error sending push notification for jobId ${command.jobId} ${errorMessage}`,
            LOG_CONTEXT
          );
        }

        this.messageRepository.update(
          { _id: message._id, _environmentId: command.environmentId },
          {
            identifier: message._id,
          }
        );

        continue;
      }

      const targetDeviceTokens = target || [];
      for (const deviceToken of targetDeviceTokens) {
        const message = await this.createMessage({
          command,
          integration,
          title,
          content,
          deviceTokens: target,
          overrides,
        });

        const result = await this.sendMessage(
          command,
          message,
          subscriber,
          integration,
          deviceToken,
          title,
          content,
          overrides,
          stepData
        );

        this.messageRepository.update(
          { _id: message._id, _environmentId: command.environmentId },
          {
            identifier: message._id,
          }
        );

        if (result.success) {
          status = SendMessageStatus.SUCCESS;
        } else {
          const errorMessage = result.error.message || result.error.toString();
          const logMethod = isSubscriberError(errorMessage) ? 'debug' : 'error';
          Logger[logMethod](
            { jobId: command.jobId },
            `Error sending push notification for jobId ${command.jobId} ${errorMessage}`,
            LOG_CONTEXT
          );
        }
      }
    }

    if (status === 'skipped') {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.PUSH_SOME_CHANNELS_SKIPPED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.WARNING,
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatusEnum.SKIPPED,
          detail: DeliveryLifecycleDetail.USER_MISSING_PUSH_TOKEN,
        },
      };
    } else if (status === 'failed') {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.NOTIFICATION_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status,
        errorMessage: DetailEnum.NOTIFICATION_ERROR,
      };
    }

    return {
      status,
    };
  }

  private async updateOverridesWithInboxUnreadCount(
    command: SendMessageChannelCommand,
    overrides: Record<string, unknown>,
    subscriber: SubscriberEntity,
    inboxCountType: InboxCountTypeEnum
  ): Promise<Record<string, unknown>> {
    const filter =
      inboxCountType === InboxCountTypeEnum.UNREAD ? { read: false, snoozed: false } : { seen: false, snoozed: false };

    const inboxUnreadCount = await this.messageRepository.getCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      filter,
      { limit: 99 },
      command.contextKeys
    );

    const androidOverrides = (overrides.android as Record<string, any>) ?? {};
    const apnsOverrides = (overrides.apns as Record<string, any>) ?? {};

    return {
      ...overrides,
      android: {
        ...androidOverrides,
        notification: {
          notificationCount: inboxUnreadCount,
          ...androidOverrides.notification,
        },
      },
      apns: {
        ...apnsOverrides,
        payload: {
          ...apnsOverrides?.payload,
          aps: {
            badge: inboxUnreadCount,
            ...apnsOverrides?.payload?.aps,
          },
        },
      },
    };
  }

  /**
   * Collects all push provider IDs and their overrides from the TriggerOverrides structure
   */
  private getPushProviderOverrides(overrides: TriggerOverrides, stepId: string): IPushProviderOverride[] {
    if (!overrides) return [];

    const result: IPushProviderOverride[] = [];

    if (overrides.providers) {
      for (const providerId of Object.keys(overrides.providers)) {
        if (this.pushProviderIds.includes(providerId as PushProviderIdEnum)) {
          result.push({
            providerId: providerId as PushProviderIdEnum,
            overrides: {
              ...overrides.providers[providerId as ProvidersIdEnum],
            },
          });
        }
      }
    }

    if (overrides.steps?.[stepId]?.providers) {
      for (const providerId of Object.keys(overrides.steps[stepId].providers)) {
        if (this.pushProviderIds.includes(providerId as PushProviderIdEnum)) {
          const existingIndex = result.findIndex((item) => item.providerId === providerId);

          if (existingIndex >= 0) {
            // Merge with existing overrides, with step overrides taking precedence
            result[existingIndex].overrides = merge(
              {},
              result[existingIndex].overrides,
              overrides.steps[stepId].providers[providerId as ProvidersIdEnum]
            );
          } else {
            // Add new provider overrides
            result.push({
              providerId: providerId as PushProviderIdEnum,
              overrides: {
                ...overrides.steps[stepId].providers[providerId as ProvidersIdEnum],
              },
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Checks if specific overrides keys exist based on the delivery provider.
   * This solution is not ideal, as we expose provider related concerns in the usecase layer.
   * We will have to revisit this once we have a more flexible way to handle overrides and push providers.
   */
  private hasProviderSpecificOverrides(providerId: PushProviderIdEnum, overrides: Record<string, unknown>): boolean {
    if (!overrides) return false;

    switch (providerId) {
      case PushProviderIdEnum.FCM:
        return 'tokens' in overrides || 'topic' in overrides;
      default:
        return false;
    }
  }

  /**
   * Filters the provided array of push provider overrides and returns only those
   * that contain provider-specific credential keys
   */
  private filterProvidersWithCredentialOverrides(providerOverrides: IPushProviderOverride[]): IPushProviderOverride[] {
    if (!providerOverrides?.length) return [];

    return providerOverrides.filter((override) =>
      this.hasProviderSpecificOverrides(override.providerId, override.overrides)
    );
  }

  private async isChannelMissingDeviceTokens(channel: IChannelSettings): Promise<boolean> {
    const { deviceTokens } = channel.credentials || {};

    return !deviceTokens || (Array.isArray(deviceTokens) && deviceTokens.length === 0);
  }

  private async getSubscriberIntegration(
    channel: IChannelSettings,
    command: SendMessageChannelCommand
  ): Promise<IntegrationEntity | undefined> {
    const integration = await this.getIntegration({
      id: channel._integrationId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      channelType: ChannelTypeEnum.PUSH,
      providerId: channel.providerId,
      userId: command.userId,
      filterData: {
        tenant: command.job.tenant,
      },
    });

    if (!integration) {
      await this.createExecutionDetailsError(DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION, command.job);

      return undefined;
    }

    return integration;
  }

  private async createExecutionDetailsError(
    detail: DetailEnum,
    job: JobEntity,
    contextData?: {
      messageId?: string;
      providerId?: ProvidersIdEnum;
      raw?: string;
    }
  ): Promise<void> {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.FAILED,
        isTest: false,
        isRetry: false,
        ...(contextData?.providerId && { providerId: contextData.providerId }),
        ...(contextData?.messageId && { messageId: contextData.messageId }),
        ...(contextData?.raw && { raw: contextData.raw }),
      })
    );
  }

  private async sendMessage(
    command: SendMessageChannelCommand,
    message: MessageEntity,
    subscriber: IPushOptions['subscriber'],
    integration: IntegrationEntity,
    deviceToken: string,
    title: string,
    content: string,
    overrides: object,
    step: IPushOptions['step']
  ): Promise<{ success: false; error: Error } | { success: true; error: undefined }> {
    try {
      Logger.log(
        { jobId: command.jobId, deviceToken, overrides, step },
        `Sending push notification for jobId ${command.jobId}`,
        LOG_CONTEXT
      );
      const pushHandler = this.getIntegrationHandler(integration);
      const bridgeOutputs = command.bridgeData?.outputs;

      Logger.debug(
        { jobId: command.jobId, deviceToken, overrides, step },
        `Push handler obtained for jobId ${command.jobId}`,
        LOG_CONTEXT
      );

      const result = await pushHandler.send({
        target: [deviceToken],
        title: (bridgeOutputs as PushOutput)?.subject || title,
        content: (bridgeOutputs as PushOutput)?.body || content,
        payload: { ...command.payload, __nvMessageId: message._id },
        messageId: message._id,
        overrides,
        subscriber,
        step,
        bridgeProviderData: this.combineOverrides(
          command.bridgeData,
          command.overrides,
          command.step.stepId,
          integration.providerId
        ),
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
          raw: JSON.stringify({ providerId: integration.providerId, result, deviceToken }),
        })
      );

      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.MESSAGE_SENT,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message, command.subscriberId, {
            providerResponseId: result.id,
            deviceToken,
          }),
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });

      return { success: true, error: undefined };
    } catch (e) {
      Logger.log(
        {
          jobId: command.jobId,
          errorContent: serializePushProviderError(e),
          code: e?.code,
          message: e?.message,
          details: e?.details,
        },
        `Failed push delivery for jobId ${command.jobId} ${e.message || e.toString()}`,
        LOG_CONTEXT
      );

      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_push_error',
        e.message || e.name || 'Un-expect Push provider error',
        command,
        e
      );

      const raw = serializePushProviderError(e);

      try {
        await this.createExecutionDetailsError(DetailEnum.PROVIDER_ERROR, command.job, {
          messageId: message._id,
          raw,
        });
      } catch (err) {
        Logger.error(
          { jobId: command.jobId },
          `Error sending provider error for jobId ${command.jobId} ${err.message || err.toString()}`,
          LOG_CONTEXT
        );
      }

      try {
        const pushHandler = this.getIntegrationHandler(integration);
        const isTokenInvalid = pushHandler?.isTokenInvalid?.(e.message || e.toString());

        if (isTokenInvalid) {
          Logger.log(
            { jobId: command.jobId, deviceToken, providerId: integration.providerId },
            `Invalid device token detected for jobId ${command.jobId}, removing token from subscriber`,
            LOG_CONTEXT
          );

          const isExpiredTokensRemovalEnabled = await this.featureFlagsService.getFlag({
            key: FeatureFlagsKeysEnum.IS_EXPIRED_TOKENS_REMOVAL_ENABLED,
            defaultValue: false,
            organization: { _id: command.organizationId },
            user: { _id: command.userId },
            environment: { _id: command.environmentId },
          });

          if (isExpiredTokensRemovalEnabled) {
            await this.removeInvalidDeviceToken(
              command._subscriberId,
              deviceToken,
              integration._id,
              command,
              e.message || e.toString(),
              message._id
            );
          }
        }

        await this.sendWebhookMessage.execute({
          eventType: WebhookEventEnum.MESSAGE_FAILED,
          objectType: WebhookObjectTypeEnum.MESSAGE,
          payload: {
            object: messageWebhookMapper(message, command.subscriberId),
            error: {
              push: {
                reason: isTokenInvalid ? 'token_invalid' : 'generic_error',
                deviceToken: deviceToken,
              },
              message: e.message || e.name || 'Error while sending push with provider',
            },
          },
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        });
      } catch (err) {
        Logger.error(
          { jobId: command.jobId },
          `Error sending webhook message for jobId ${command.jobId} ${err.message || err.toString()}`,
          LOG_CONTEXT
        );
      }

      return { success: false, error: e };
    }
  }

  private async createMessage({
    command,
    integration,
    title,
    content,
    deviceTokens,
    overrides,
  }: {
    command: SendMessageChannelCommand;
    integration: IntegrationEntity;
    title: string;
    content: string;
    deviceTokens?: string[];
    overrides: object;
  }): Promise<MessageEntity> {
    const message = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: command.step?.template?._id,
      channel: ChannelTypeEnum.PUSH,
      transactionId: command.transactionId,
      deviceTokens,
      content: this.storeContent() ? content : null,
      title,
      payload: command.payload as never,
      overrides: overrides as never,
      providerId: integration.providerId,
      _jobId: command.jobId,
      tags: command.tags,
      severity: command.severity,
      stepId: command.step?.stepId,
      contextKeys: command.contextKeys,
    });

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          providerId: integration.providerId,
          content: this.storeContent() ? JSON.stringify(content) : null,
        }),
      })
    );

    return message;
  }

  private getIntegrationHandler(integration: IntegrationEntity): IPushHandler {
    const pushFactory = new PushFactory();
    const pushHandler = pushFactory.getHandler(integration);

    if (!pushHandler) {
      const message = `Push handler for provider ${integration.providerId} is  not found`;
      throw new PlatformException(message);
    }

    return pushHandler;
  }

  private async constructChannelSettingsFromOverrides(
    providersWithCredentialOverrides: IPushProviderOverride[],
    command: SendMessageChannelCommand
  ): Promise<IChannelSettings[]> {
    const channelSettings: IChannelSettings[] = [];

    for (const providerOverride of providersWithCredentialOverrides) {
      const credentials = this.extractCredentialsFromOverride(providerOverride.providerId, providerOverride.overrides);

      if (!credentials) continue;

      const integration = await this.selectIntegration.execute({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.PUSH,
        providerId: providerOverride.providerId,
        userId: command.userId,
        filterData: {
          tenant: command.job.tenant,
        },
      });

      if (!integration) continue;

      channelSettings.push({
        _integrationId: integration._id,
        providerId: providerOverride.providerId,
        credentials,
      });
    }

    return channelSettings;
  }

  private extractCredentialsFromOverride(
    providerId: PushProviderIdEnum,
    overrides: Record<string, unknown>
  ): {
    deviceTokens?: string[];
    topic?: string;
  } | null {
    if (!overrides) return null;

    switch (providerId) {
      case PushProviderIdEnum.FCM:
        if (Array.isArray(overrides.tokens)) {
          return {
            deviceTokens: overrides.tokens,
          };
        }

        if (overrides.topic) {
          return {
            topic: overrides.topic as string,
          };
        }

        return null;
      default:
        return null;
    }
  }

  private async removeInvalidDeviceToken(
    subscriberId: string,
    deviceToken: string,
    integrationId: string,
    command: SendMessageChannelCommand,
    providerErrorMessage: string,
    messageId: string
  ): Promise<void> {
    try {
      await this.subscriberRepository.update(
        {
          _environmentId: command.environmentId,
          _id: subscriberId,
          'channels._integrationId': integrationId,
        },
        {
          $pull: {
            'channels.$.credentials.deviceTokens': deviceToken,
          },
        }
      );

      await this.invalidateCache.invalidateByKey({
        key: buildSubscriberKey({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId,
          detail: DetailEnum.PUSH_INVALID_TOKEN_REMOVED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            deviceToken,
            providerError: providerErrorMessage,
          }),
        })
      );

      Logger.log(
        {
          subscriberId: command.subscriberId,
          deviceToken,
          integrationId,
        },
        `Successfully removed invalid device token from subscriber`,
        LOG_CONTEXT
      );
    } catch (error) {
      Logger.error(
        {
          subscriberId: command.subscriberId,
          deviceToken,
          integrationId,
          error: error.message,
        },
        `Failed to remove invalid device token from subscriber: ${error.message}`,
        LOG_CONTEXT
      );
    }
  }
}
