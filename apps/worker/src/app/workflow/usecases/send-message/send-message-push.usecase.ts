import { Injectable, Logger } from '@nestjs/common';
import { addBreadcrumb } from '@sentry/node';
import { ModuleRef } from '@nestjs/core';
import { merge } from 'lodash';

import { MessageRepository, SubscriberRepository, MessageEntity, IntegrationEntity, JobEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  PushProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IChannelSettings,
  ProvidersIdEnum,
  TriggerOverrides,
} from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  SelectIntegration,
  CompileTemplate,
  CompileTemplateCommand,
  IPushHandler,
  PushFactory,
  GetNovuProviderCredentials,
  SelectVariant,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
} from '@novu/application-generic';
import { IPushOptions } from '@novu/stateless';
import { PushOutput } from '@novu/framework/internal';

import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';

import { PlatformException } from '../../../shared/utils';
import { SendMessageResult } from './send-message-type.usecase';

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
    protected moduleRef: ModuleRef
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
  public async execute(command: SendMessageCommand): Promise<SendMessageResult> {
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
        status: 'failed',
        reason: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
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
        status: 'failed',
        reason: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
      };
    }

    const messagePayload = { ...command.payload };
    delete messagePayload.attachments;

    let integrationsWithErrors = 0;
    for (const channel of allPushChannels) {
      const { deviceTokens } = channel.credentials || {};

      let isChannelMissingDeviceTokens;
      let integration;
      try {
        [isChannelMissingDeviceTokens, integration] = await Promise.all([
          this.isChannelMissingDeviceTokens(channel, command),
          this.getSubscriberIntegration(channel, command),
        ]);
      } catch (error) {
        integrationsWithErrors += 1;
        Logger.error(
          { jobId: command.jobId },
          `Unexpected error while processing channel for jobId ${command.jobId} ${error.message || error.toString()}`,
          LOG_CONTEXT
        );
        continue;
      }

      // We avoid to send a message if subscriber has not an integration or if the subscriber has no device tokens for said integration
      if ((!deviceTokens || !integration || isChannelMissingDeviceTokens) && !uniqueOverrideChannels?.length) {
        integrationsWithErrors += 1;
        continue;
      }

      const overrides = command.overrides[integration.providerId] || {};
      const target = (overrides as { deviceTokens?: string[] }).deviceTokens || deviceTokens;

      await this.sendSelectedIntegrationExecution(command.job, integration);

      const message = await this.createMessage(command, integration, title, content, target, overrides);

      const bridgeProviderData = this.combineOverrides(
        command.bridgeData,
        command.overrides,
        command.step.stepId,
        integration.providerId
      );

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
          stepData,
          bridgeProviderData
        );

        if (!result.success) {
          integrationsWithErrors += 1;

          Logger.error(
            { jobId: command.jobId },
            `Error sending push notification for jobId ${command.jobId} ${result.error.message || result.error.toString()}`,
            LOG_CONTEXT
          );
        }

        continue;
      }

      for (const deviceToken of target) {
        const result = await this.sendMessage(
          command,
          message,
          subscriber,
          integration,
          deviceToken,
          title,
          content,
          overrides,
          stepData,
          bridgeProviderData
        );

        if (!result.success) {
          integrationsWithErrors += 1;

          Logger.error(
            { jobId: command.jobId },
            `Error sending push notification for jobId ${command.jobId} ${result.error.message || result.error.toString()}`,
            LOG_CONTEXT
          );
        }
      }
    }

    if (integrationsWithErrors > 0) {
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
        status: 'failed',
        reason: DetailEnum.NOTIFICATION_ERROR,
      };
    }

    return {
      status: 'success',
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

  private async isChannelMissingDeviceTokens(channel: IChannelSettings, command: SendMessageCommand): Promise<boolean> {
    const { deviceTokens } = channel.credentials;
    if (!deviceTokens || (Array.isArray(deviceTokens) && deviceTokens.length === 0)) {
      await this.sendPushMissingDeviceTokensError(command.job, channel);

      return true;
    }

    return false;
  }

  private async getSubscriberIntegration(
    channel: IChannelSettings,
    command: SendMessageCommand
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

  private async sendPushMissingDeviceTokensError(job: JobEntity, channel: IChannelSettings): Promise<void> {
    const raw = JSON.stringify(channel);
    await this.createExecutionDetailsError(DetailEnum.PUSH_MISSING_DEVICE_TOKENS, job, {
      raw,
      providerId: channel.providerId,
    });
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
    command: SendMessageCommand,
    message: MessageEntity,
    subscriber: IPushOptions['subscriber'],
    integration: IntegrationEntity,
    deviceToken: string,
    title: string,
    content: string,
    overrides: object,
    step: IPushOptions['step'],
    bridgeProviderData: IPushOptions['bridgeProviderData']
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
          detail: `${DetailEnum.MESSAGE_SENT}: ${integration.providerId}`,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ result, deviceToken }),
        })
      );

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

  private async createMessage(
    command: SendMessageCommand,
    integration: IntegrationEntity,
    title: string,
    content: string,
    deviceTokens: string[],
    overrides: object
  ): Promise<MessageEntity> {
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
    });

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: `${DetailEnum.MESSAGE_CREATED}: ${integration.providerId}`,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(content) : null,
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
    command: SendMessageCommand
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
