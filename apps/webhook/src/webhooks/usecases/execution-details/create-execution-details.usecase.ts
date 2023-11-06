import { Injectable, Logger, Module } from '@nestjs/common';
import { ExecutionDetailsEntity, ExecutionDetailsRepository, MessageEntity } from '@novu/dal';
import { ChannelTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import { CreateExecutionDetailsCommand, WebhookCommand } from './create-execution-details.command';

import { IWebhookResult } from '../../dtos/webhooks-response.dto';
import { EmailEventStatusEnum, SmsEventStatusEnum } from '@novu/stateless';

const LOG_CONTEXT = 'CreateExecutionDetails';

@Injectable()
export class CreateExecutionDetails {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(command: CreateExecutionDetailsCommand): Promise<void> {
    const executionDetailsEntity = this.mapWebhookEventIntoEntity(
      command.webhook,
      command.message,
      command.webhookEvent,
      command.channel
    );

    Logger.verbose({ executionDetailsEntity }, 'Creating execution details', LOG_CONTEXT);

    await this.executionDetailsRepository.create(executionDetailsEntity, { writeConcern: 1 });

    Logger.verbose({ executionDetailsEntity }, 'Created execution details', LOG_CONTEXT);
  }

  private mapWebhookEventIntoEntity(
    webhook: WebhookCommand,
    message: MessageEntity,
    webhookEvent: IWebhookResult,
    channel: ChannelTypeEnum
  ): Omit<ExecutionDetailsEntity, '_id' | 'createdAt'> {
    const { environmentId: _environmentId, organizationId: _organizationId, providerId, type } = webhook;
    const { _jobId, _templateId, _notificationId, _subscriberId, transactionId, _id } = message;
    const { externalId, attempts, response, row, status } = webhookEvent.event;

    return {
      _jobId,
      _environmentId,
      _organizationId,
      _subscriberId,
      _notificationId,
      _messageId: _id,
      _notificationTemplateId: _templateId,
      providerId,
      transactionId,
      status: this.mapStatus(status, channel),
      detail: `${response} - (${status})` || status,
      source: ExecutionDetailsSourceEnum.WEBHOOK,
      raw: JSON.stringify(row),
      isRetry: false,
      isTest: false,
      webhookStatus: status,
    };
  }

  private mapStatus(
    eventStatus: EmailEventStatusEnum | SmsEventStatusEnum,
    channel: ChannelTypeEnum
  ): ExecutionDetailsStatusEnum {
    switch (channel) {
      case ChannelTypeEnum.EMAIL:
        return this.mapEmailStatus(eventStatus as EmailEventStatusEnum);
      case ChannelTypeEnum.SMS:
        return this.mapSmsStatus(eventStatus as SmsEventStatusEnum);
      default:
        return ExecutionDetailsStatusEnum.SUCCESS;
    }
  }

  private mapEmailStatus(eventStatus: EmailEventStatusEnum): ExecutionDetailsStatusEnum {
    switch (eventStatus) {
      case EmailEventStatusEnum.OPENED:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case EmailEventStatusEnum.REJECTED:
        return ExecutionDetailsStatusEnum.FAILED;
      case EmailEventStatusEnum.SENT:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case EmailEventStatusEnum.DEFERRED:
        return ExecutionDetailsStatusEnum.PENDING;
      case EmailEventStatusEnum.DELIVERED:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case EmailEventStatusEnum.BOUNCED:
        return ExecutionDetailsStatusEnum.FAILED;
      case EmailEventStatusEnum.DROPPED:
        return ExecutionDetailsStatusEnum.FAILED;
      case EmailEventStatusEnum.CLICKED:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case EmailEventStatusEnum.BLOCKED:
        return ExecutionDetailsStatusEnum.FAILED;
      case EmailEventStatusEnum.SPAM:
        return ExecutionDetailsStatusEnum.FAILED;
      case EmailEventStatusEnum.UNSUBSCRIBED:
        return ExecutionDetailsStatusEnum.FAILED;
      default:
        return ExecutionDetailsStatusEnum.SUCCESS;
    }
  }

  private mapSmsStatus(eventStatus: SmsEventStatusEnum): ExecutionDetailsStatusEnum {
    switch (eventStatus) {
      case SmsEventStatusEnum.CREATED:
        return ExecutionDetailsStatusEnum.PENDING;
      case SmsEventStatusEnum.DELIVERED:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case SmsEventStatusEnum.ACCEPTED:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case SmsEventStatusEnum.QUEUED:
        return ExecutionDetailsStatusEnum.QUEUED;
      case SmsEventStatusEnum.SENDING:
        return ExecutionDetailsStatusEnum.PENDING;
      case SmsEventStatusEnum.SENT:
        return ExecutionDetailsStatusEnum.SUCCESS;
      case SmsEventStatusEnum.FAILED:
        return ExecutionDetailsStatusEnum.FAILED;
      case SmsEventStatusEnum.UNDELIVERED:
        return ExecutionDetailsStatusEnum.FAILED;
      default:
        return ExecutionDetailsStatusEnum.SUCCESS;
    }
  }
}
