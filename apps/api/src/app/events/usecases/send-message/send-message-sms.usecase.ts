import { Injectable } from '@nestjs/common';
import {
  IntegrationRepository,
  MessageRepository,
  NotificationStepEntity,
  NotificationRepository,
  SubscriberEntity,
  SubscriberRepository,
  NotificationEntity,
  MessageEntity,
} from '@novu/dal';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { SmsFactory } from '../../services/sms-service/sms.factory';
import { SendMessageCommand } from './send-message.command';
import { SendMessageType } from './send-message-type.usecase';

@Injectable()
export class SendMessageSms extends SendMessageType {
  private smsFactory = new SmsFactory();

  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    private integrationRepository: IntegrationRepository
  ) {
    super(messageRepository, createLogUsecase);
  }

  public async execute(command: SendMessageCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending SMS',
    });
    const smsChannel: NotificationStepEntity = command.step;
    const notification = await this.notificationRepository.findById(command.notificationId);
    const subscriber: SubscriberEntity = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.subscriberId,
    });
    const contentService = new ContentService();
    const messageVariables = contentService.buildMessageVariables(command.payload, subscriber);
    const content = contentService.replaceVariables(smsChannel.template.content as string, messageVariables);
    const phone = command.payload.phone || subscriber.phone;

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.SMS,
      active: true,
    });

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: smsChannel.template._id,
      channel: ChannelTypeEnum.SMS,
      transactionId: command.transactionId,
      phone,
      content,
      providerId: integration.providerId,
    });

    if (phone && integration) {
      await this.sendMessage(phone, integration, content, message, command, notification);

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
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Subscriber does not have active phone',
          userId: command.userId,
          subscriberId: command.subscriberId,
          code: LogCodeEnum.SUBSCRIBER_MISSING_PHONE,
          templateId: notification._templateId,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );
      await this.messageRepository.updateMessageStatus(
        message._id,
        'warning',
        null,
        'no_subscriber_phone',
        'Subscriber does not have active phone'
      );
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
    }
  }

  private async sendMessage(
    phone,
    integration,
    content,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    try {
      const smsHandler = this.smsFactory.getHandler(integration);

      await smsHandler.send({
        to: phone,
        from: integration.credentials.from,
        content,
        attachments: null,
      });
    } catch (e) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: e.message || e.name || 'Un-expect SMS provider error',
          userId: command.userId,
          code: LogCodeEnum.SMS_ERROR,
          templateId: notification._templateId,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );

      await this.messageRepository.updateMessageStatus(
        message._id,
        'error',
        e,
        'unexpected_sms_error',
        e.message || e.name || 'Un-expect SMS provider error'
      );
    }
  }
}
