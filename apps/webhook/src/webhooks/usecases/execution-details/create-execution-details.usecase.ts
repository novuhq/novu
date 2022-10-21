import { Injectable, Module } from '@nestjs/common';
import { ExecutionDetailsEntity, ExecutionDetailsRepository, MessageEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';

import { CreateExecutionDetailsCommand, WebhookCommand } from './create-execution-details.command';

import { IWebhookResult } from '../../dtos/webhooks-response.dto';

@Injectable()
export class CreateExecutionDetails {
  constructor(private executionDetailsRepository: ExecutionDetailsRepository) {}

  async execute(command: CreateExecutionDetailsCommand): Promise<void> {
    const executionDetailsEntity = this.mapWebhookEventIntoEntity(
      command.webhook,
      command.message,
      command.webhookEvent
    );

    await this.executionDetailsRepository.create(executionDetailsEntity);
  }

  private mapWebhookEventIntoEntity(
    webhook: WebhookCommand,
    message: MessageEntity,
    webhookEvent: IWebhookResult
  ): ExecutionDetailsEntity {
    const { environmentId: _environmentId, organizationId: _organizationId, providerId, type } = webhook;
    const { _jobId, _templateId, _notificationId, _subscriberId, transactionId } = message;
    const { externalId, attempts, response, row, status } = webhookEvent.event;

    return {
      _jobId,
      _environmentId,
      _organizationId,
      _subscriberId,
      _notificationId,
      _notificationTemplateId: _templateId,
      providerId,
      transactionId,
      status: this.mapStatus(status),
      // TODO: Response brings parsed response by Novu, row is the raw details from provider
      detail: response || row,
      source: ExecutionDetailsSourceEnum.WEBHOOK,
      isRetry: false, // TODO: Where we get this from?
      isTest: false, // TODO: Should we add the information in MessageEntity?
    };
  }

  private mapStatus(eventStatus): ExecutionDetailsStatusEnum {
    /**
     * TODO: Mapping here
     * console.log(eventStatus);
     */

    return ExecutionDetailsStatusEnum.SUCCESS;
  }
}
