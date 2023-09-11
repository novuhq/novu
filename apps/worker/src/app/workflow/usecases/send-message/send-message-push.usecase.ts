import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  MessageRepository,
  NotificationStepEntity,
  SubscriberRepository,
  MessageEntity,
  IntegrationEntity,
  TenantRepository,
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
  SelectIntegration,
  CompileTemplate,
  CompileTemplateCommand,
  PushFactory,
  GetNovuProviderCredentials,
} from '@novu/application-generic';
import type { IPushOptions } from '@novu/stateless';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

@Injectable()
export class SendMessagePush extends SendMessageBase {
  channelType = ChannelTypeEnum.PUSH;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected tenantRepository: TenantRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials
  ) {
    super(
      messageRepository,
      createLogUsecase,
      createExecutionDetails,
      subscriberRepository,
      tenantRepository,
      selectIntegration,
      getNovuProviderCredentials
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

    const stepData: IPushOptions['step'] = {
      digest: !!command.events?.length,
      events: command.events,
      total_count: command.events?.length,
    };
    const tenant = await this.handleTenantExecution(command.job);

    const data = {
      subscriber: subscriber,
      step: stepData,
      ...(tenant && { tenant }),
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
      await this.sendErrors(command);

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

      await this.sendSelectedIntegrationExecution(command.job, integration);

      const overrides = command.overrides[integration.providerId] || {};

      await this.sendMessage(
        subscriber,
        integration,
        channel.credentials.deviceTokens,
        title,
        content,
        command,
        command.payload,
        overrides,
        stepData
      );
    }
  }

  private async sendErrors(command: SendMessageCommand) {
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
    subscriber: IPushOptions['subscriber'],
    integration: IntegrationEntity,
    target: string[],
    title: string,
    content: string,
    command: SendMessageCommand,
    payload: object,
    overrides: object,
    step: IPushOptions['step']
  ) {
    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
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
        subscriber,
        step,
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
          raw: JSON.stringify(e) !== JSON.stringify({}) ? JSON.stringify(e) : JSON.stringify(e.message),
        })
      );

      return;
    }
  }
}
