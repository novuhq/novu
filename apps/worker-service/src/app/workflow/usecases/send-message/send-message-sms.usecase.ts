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
import { ChannelTypeEnum, LogCodeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
  CompileTemplate,
  CompileTemplateCommand,
  SmsFactory,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils/exceptions';

@Injectable()
export class SendMessageSms extends SendMessageBase {
  channelType = ChannelTypeEnum.SMS;

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

    const integration = await this.getIntegration(
      GetDecryptedIntegrationsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.SMS,
        findOne: true,
        active: true,
        userId: command.userId,
      })
    );

    Sentry.addBreadcrumb({
      message: 'Sending SMS',
    });

    const smsChannel: NotificationStepEntity = command.step;
    if (!smsChannel.template) throw new PlatformException(`Unexpected error: SMS template is missing`);

    const notification = await this.notificationRepository.findById(command.notificationId);
    if (!notification) throw new PlatformException(`Unexpected error: Notification not found`);

    const payload = {
      subscriber: subscriber,
      step: {
        digest: !!command.events?.length,
        events: command.events,
        total_count: command.events?.length,
      },
      ...command.payload,
    };

    let content: string | null = '';

    try {
      content = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: smsChannel.template.content as string,
          data: payload,
        })
      );
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    if (!content) {
      throw new PlatformException(`Unexpected error: SMS content is missing`);
    }

    const phone = command.payload.phone || subscriber.phone;

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

    const overrides = command.overrides[integration?.providerId] || {};

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: smsChannel.template._id,
      channel: ChannelTypeEnum.SMS,
      transactionId: command.transactionId,
      phone,
      content: this.storeContent() ? content : null,
      providerId: integration?.providerId,
      payload: messagePayload,
      overrides,
      templateIdentifier: command.identifier,
      _jobId: command.jobId,
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
        raw: this.storeContent() ? JSON.stringify(messagePayload) : null,
      })
    );

    if (phone && integration) {
      await this.sendMessage(phone, integration, content, message, command, notification, overrides);

      return;
    }

    await this.sendErrors(phone, integration, message, command, notification);
  }

  private async sendErrors(
    phone,
    integration,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    if (!phone) {
      await this.messageRepository.updateMessageStatus(
        command.environmentId,
        message._id,
        'warning',
        null,
        'no_subscriber_phone',
        'Subscriber does not have active phone'
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_CHANNEL_DETAILS,
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
        'sms_missing_integration_error',
        'Subscriber does not have an active sms integration',
        command,
        notification,
        LogCodeEnum.MISSING_SMS_INTEGRATION
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
    if (!integration?.credentials?.from) {
      await this.sendErrorStatus(
        message,
        'warning',
        'no_integration_from_phone',
        'Integration does not have from phone configured',
        command,
        notification,
        LogCodeEnum.MISSING_SMS_PROVIDER
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
  }

  private async sendMessage(
    phone: string,
    integration: IntegrationEntity,
    content: string,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity,
    overrides: object
  ) {
    try {
      const smsFactory = new SmsFactory();
      const smsHandler = smsFactory.getHandler(integration);
      if (!smsHandler) {
        throw new PlatformException(`Sms handler for provider ${integration.providerId} is  not found`);
      }

      const result = await smsHandler.send({
        to: phone,
        from: integration.credentials.from,
        content,
        id: message._id,
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

      if (!result?.id) {
        return;
      }

      await this.messageRepository.update(
        { _environmentId: command.environmentId, _id: message._id },
        {
          $set: {
            identifier: result.id,
          },
        }
      );
    } catch (e) {
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_sms_error',
        e.message || e.name || 'Un-expect SMS provider error',
        command,
        notification,
        LogCodeEnum.SMS_ERROR,
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
