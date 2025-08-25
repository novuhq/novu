import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  CompileTemplate,
  CompileTemplateCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  IPushHandler,
  messageWebhookMapper,
  PushFactory,
  SelectIntegration,
  SelectVariant,
  SendWebhookMessage,
} from '@novu/application-generic';
import { IntegrationEntity, JobEntity, MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { PushOutput } from '@novu/framework/internal';
import {
  ChannelTypeEnum,
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatus,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IChannelSettings,
  ProvidersIdEnum,
  PushProviderIdEnum,
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
    private sendWebhookMessage: SendWebhookMessage
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
      await this.createExecutionDetailsError(DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL, command.job);

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
      };
    }

    const messagePayload = { ...command.payload };
    delete messagePayload.attachments;

    let status: SendMessageResult['status'] = SendMessageStatus.FAILED;
    for (const channel of allPushChannels) {
      const { deviceTokens } = channel.credentials || {};

      const isChannelMissingDeviceTokens = await this.isChannelMissingDeviceTokens(channel);
      if (isChannelMissingDeviceTokens) {
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

      let integration;
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

      // We avoid to send a message if subscriber has not an integration or if the subscriber has no device tokens for said integration
      if ((!deviceTokens || !integration || isChannelMissingDeviceTokens) && !uniqueOverrideChannels?.length) {
        continue;
      }

      const overrides = command.overrides[integration.providerId] || {};
      const target = (overrides as { deviceTokens?: string[] }).deviceTokens || deviceTokens;

      await this.sendSelectedIntegrationExecution(command.job, integration);

      const message = await this.createMessage({
        command,
        integration,
        title,
        content,
        deviceTokens: target,
        overrides,
      });

      /**
       * There are no targets available for the subscriber, but credentials provided in the overrides
       */
      if (!target?.length && uniqueOverrideChannels?.length) {
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
          Logger.error(
            { jobId: command.jobId },
            `Error sending push notification for jobId ${command.jobId} ${result.error.message || result.error.toString()}`,
            LOG_CONTEXT
          );
        }

        continue;
      }

      const targetDeviceTokens = target || [];
      for (const deviceToken of targetDeviceTokens) {
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

        if (result.success) {
          status = SendMessageStatus.SUCCESS;
        } else {
          Logger.error(
            { jobId: command.jobId },
            `Error sending push notification for jobId ${command.jobId} ${result.error.message || result.error.toString()}`,
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
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatus.SKIPPED,
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
      const pushHandler = this.getIntegrationHandler(integration);
      const bridgeOutputs = command.bridgeData?.outputs;

      const result = await pushHandler.send({
        target: [deviceToken],
        title: (bridgeOutputs as PushOutput)?.subject || title,
        content: (bridgeOutputs as PushOutput)?.body || content,
        payload: command.payload,
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
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_push_error',
        e.message || e.name || 'Un-expect Push provider error',
        command,
        e
      );

      const raw = JSON.stringify(e) !== JSON.stringify({}) ? JSON.stringify(e) : JSON.stringify(e.message);

      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.MESSAGE_SENT,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message, command.subscriberId),
          error: {
            message: e.message || e.name || 'Error while sending push with provider',
          },
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });

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

  private getIntegrationHandler(integration): IPushHandler {
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
}
