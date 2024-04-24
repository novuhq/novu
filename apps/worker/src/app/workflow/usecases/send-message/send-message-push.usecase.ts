import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ModuleRef } from '@nestjs/core';

import {
  MessageRepository,
  NotificationStepEntity,
  SubscriberRepository,
  MessageEntity,
  IntegrationEntity,
  JobEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  LogCodeEnum,
  PushProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IChannelSettings,
  ProvidersIdEnum,
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
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
  IChimeraPushResponse,
} from '@novu/application-generic';
import type { IPushOptions } from '@novu/stateless';

import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';

import { CreateLog } from '../../../shared/logs';
import { PlatformException } from '../../../shared/utils';

const LOG_CONTEXT = 'SendMessagePush';

@Injectable()
export class SendMessagePush extends SendMessageBase {
  channelType = ChannelTypeEnum.PUSH;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected executionLogRoute: ExecutionLogRoute,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
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
      message: 'Sending Push',
    });

    const step: NotificationStepEntity = command.step;
    const { subscriber, step: stepData } = command.compileContext;

    const template = await this.processVariants(command);
    await this.initiateTranslations(command.environmentId, command.organizationId, subscriber.locale);

    if (template) {
      step.template = template;
    }

    const data = this.getCompilePayload(command.compileContext);
    let content = '';
    let title = '';

    try {
      if (!command.chimeraData) {
        content = await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: step.template?.content as string,
            data,
          })
        );

        title = await this.compileTemplate.execute(
          CompileTemplateCommand.create({
            template: step.template?.title as string,
            data,
          })
        );
      }
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const pushChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(PushProviderIdEnum).includes(chan.providerId as PushProviderIdEnum)
      ) || [];

    if (!pushChannels.length) {
      await this.sendNoActiveChannelError(command.job);
      await this.sendNotificationError(command.job);

      return;
    }

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    let integrationsWithErrors = 0;
    for (const channel of pushChannels) {
      const { deviceTokens } = channel.credentials || {};

      const [isChannelMissingDeviceTokens, integration] = await Promise.all([
        this.isChannelMissingDeviceTokens(channel, command),
        this.getSubscriberIntegration(channel, command),
      ]);

      // We avoid to send a message if subscriber has not an integration or if the subscriber has no device tokens for said integration
      if (!deviceTokens || !integration || isChannelMissingDeviceTokens) {
        integrationsWithErrors++;
        continue;
      }

      await this.sendSelectedIntegrationExecution(command.job, integration);

      const overrides = command.overrides[integration.providerId] || {};
      const target = (overrides as { deviceTokens?: string[] }).deviceTokens || deviceTokens;

      const message = await this.createMessage(command, integration, title, content, target, overrides);

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
          stepData
        );

        if (!result) {
          integrationsWithErrors++;
        }
      }
    }

    if (integrationsWithErrors > 0) {
      Logger.error(
        { jobId: command.jobId },
        `There was an error sending the push notification(s) for the jobId ${command.jobId}`,
        LOG_CONTEXT
      );
      await this.sendNotificationError(command.job);
    }
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
      await this.sendNoActiveIntegrationError(command.job);

      return undefined;
    }

    return integration;
  }

  private async sendNotificationError(job: JobEntity): Promise<void> {
    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
        detail: DetailEnum.NOTIFICATION_ERROR,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.FAILED,
        isTest: false,
        isRetry: false,
      })
    );
  }

  private async sendPushMissingDeviceTokensError(job: JobEntity, channel: IChannelSettings): Promise<void> {
    const raw = JSON.stringify(channel);
    await this.createExecutionDetailsError(DetailEnum.PUSH_MISSING_DEVICE_TOKENS, job, {
      raw,
      providerId: channel.providerId,
    });
  }

  private async sendNoActiveIntegrationError(job: JobEntity): Promise<void> {
    await this.createExecutionDetailsError(DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION, job);
  }

  private async sendNoActiveChannelError(job: JobEntity): Promise<void> {
    await this.createExecutionDetailsError(DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL, job);
  }

  private async sendProviderError(job: JobEntity, messageId: string, raw: string): Promise<void> {
    await this.createExecutionDetailsError(DetailEnum.PROVIDER_ERROR, job, { messageId, raw });
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
    // We avoid to throw the errors to be able to execute all actions in the loop
    try {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(job),
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
    } catch (error) {}
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
    step: IPushOptions['step']
  ): Promise<boolean> {
    try {
      const pushHandler = this.getIntegrationHandler(integration);
      const chimeraOutputs = command.chimeraData?.outputs;

      const result = await pushHandler.send({
        target: [deviceToken],
        title: (chimeraOutputs as IChimeraPushResponse)?.subject || title,
        content: (chimeraOutputs as IChimeraPushResponse)?.body || content,
        payload: command.payload,
        overrides,
        subscriber,
        step,
      });

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: `${DetailEnum.MESSAGE_SENT}: ${integration.providerId}`,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ result, deviceToken }),
        })
      );

      return true;
    } catch (e) {
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_push_error',
        e.message || e.name || 'Un-expect Push provider error',
        command,
        LogCodeEnum.PUSH_ERROR,
        e
      );

      const raw = JSON.stringify(e) !== JSON.stringify({}) ? JSON.stringify(e) : JSON.stringify(e.message);

      await this.sendProviderError(command.job, message._id, raw);

      return false;
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
    });

    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
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
}
