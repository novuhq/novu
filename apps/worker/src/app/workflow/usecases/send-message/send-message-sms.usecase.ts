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
import { ChannelTypeEnum, LogCodeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import {
  InstrumentUsecase,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  SelectIntegration,
  CompileTemplate,
  CompileTemplateCommand,
  SmsFactory,
  GetNovuProviderCredentials,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

@Injectable()
export class SendMessageSms extends SendMessageBase {
  channelType = ChannelTypeEnum.SMS;

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
    if (!subscriber) throw new PlatformException('Subscriber not found');

    const overrideSelectedIntegration = command.overrides?.sms?.integrationIdentifier;

    const integration = await this.getIntegration({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      channelType: ChannelTypeEnum.SMS,
      userId: command.userId,
      identifier: overrideSelectedIntegration as string,
      filterData: {
        tenant: command.job.tenant,
      },
    });

    Sentry.addBreadcrumb({
      message: 'Sending SMS',
    });

    const smsChannel: NotificationStepEntity = command.step;
    if (!smsChannel.template) throw new PlatformException(`Unexpected error: SMS template is missing`);

    const tenant = await this.handleTenantExecution(command.job);

    const payload = {
      subscriber: subscriber,
      step: {
        digest: !!command.events?.length,
        events: command.events,
        total_count: command.events?.length,
      },
      ...(tenant && { tenant }),
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
          ...(overrideSelectedIntegration
            ? {
                raw: JSON.stringify({
                  integrationIdentifier: overrideSelectedIntegration,
                }),
              }
            : {}),
        })
      );

      return;
    }

    await this.sendSelectedIntegrationExecution(command.job, integration);

    const overrides = {
      ...(command.overrides[integration?.channel] || {}),
      ...(command.overrides[integration?.providerId] || {}),
    };

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
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
      await this.sendMessage(phone, integration, content, message, command, overrides);

      return;
    }

    await this.sendErrors(phone, integration, message, command);
  }

  private async sendErrors(phone, integration, message: MessageEntity, command: SendMessageCommand) {
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
    overrides: Record<string, any> = {}
  ) {
    try {
      const smsFactory = new SmsFactory();
      const smsHandler = smsFactory.getHandler(this.buildFactoryIntegration(integration));
      if (!smsHandler) {
        throw new PlatformException(`Sms handler for provider ${integration.providerId} is  not found`);
      }

      const result = await smsHandler.send({
        to: overrides.to || phone,
        from: overrides.from || integration.credentials.from,
        content: overrides.content || content,
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

  public buildFactoryIntegration(integration: IntegrationEntity, senderName?: string) {
    return {
      ...integration,
      providerId: integration.providerId,
    };
  }
}
