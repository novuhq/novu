import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  MessageRepository,
  NotificationStepEntity,
  NotificationRepository,
  SubscriberRepository,
  NotificationEntity,
  MessageEntity,
  IntegrationEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  LogCodeEnum,
  PushProviderIdEnum,
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
  PushFactory,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils/exceptions';

@Injectable()
export class SendMessagePush extends SendMessageBase {
  channelType = ChannelTypeEnum.PUSH;

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
    if (!subscriber) throw new PlatformException(`Subscriber not found`);

    Sentry.addBreadcrumb({
      message: 'Sending Push',
    });

    const pushChannel: NotificationStepEntity = command.step;
    const notification = await this.notificationRepository.findById(command.notificationId);
    if (!notification) throw new PlatformException(`Notification not found`);

    const data = {
      subscriber: subscriber,
      step: {
        digest: !!command.events?.length,
        events: command.events,
        total_count: command.events?.length,
      },
      ...command.payload,
    };
    let content = '';
    let title = '';

    try {
      content = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: pushChannel.template?.content as string,
          data,
        })
      );

      title = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: pushChannel.template?.title as string,
          data,
        })
      );
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const pushChannels =
      subscriber.channels?.filter((chan) =>
        Object.values(PushProviderIdEnum).includes(chan.providerId as PushProviderIdEnum)
      ) || [];

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    if (!pushChannels.length) {
      await this.sendErrors(command, notification);

      return;
    }

    for (const channel of pushChannels) {
      if (!channel.credentials?.deviceTokens) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.PUSH_MISSING_DEVICE_TOKENS,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
          })
        );

        continue;
      }

      const integration = await this.getIntegration(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: ChannelTypeEnum.PUSH,
          providerId: channel.providerId,
          findOne: true,
          active: true,
          userId: command.userId,
        })
      );

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

        continue;
      }

      const overrides = command.overrides[integration.providerId] || {};

      await this.sendMessage(
        integration,
        channel.credentials.deviceTokens,
        title,
        content,
        command,
        notification,
        command.payload,
        overrides
      );
    }
  }

  private async sendErrors(command: SendMessageCommand, notification: NotificationEntity) {
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
  }

  private async sendMessage(
    integration: IntegrationEntity,
    target: string[],
    title: string,
    content: string,
    command: SendMessageCommand,
    notification: NotificationEntity,
    payload: object,
    overrides: object
  ) {
    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: command.step?.template?._id,
      channel: ChannelTypeEnum.PUSH,
      transactionId: command.transactionId,
      deviceTokens: target,
      content: this.storeContent() ? content : null,
      title,
      payload: payload as never,
      overrides: overrides as never,
      providerId: integration.providerId,
      _jobId: command.jobId,
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

    try {
      const pushFactory = new PushFactory();
      const pushHandler = pushFactory.getHandler(integration);
      if (!pushHandler) {
        throw new PlatformException(`Push handler for provider ${integration.providerId} is  not found`);
      }

      const result = await pushHandler.send({
        target: (overrides as { deviceTokens?: string[] }).deviceTokens || target,
        title,
        content,
        payload,
        overrides,
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
          raw: JSON.stringify(result),
        })
      );
    } catch (e) {
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_push_error',
        e.message || e.name || 'Un-expect Push provider error',
        command,
        notification,
        LogCodeEnum.PUSH_ERROR,
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

      return;
    }
  }
}
