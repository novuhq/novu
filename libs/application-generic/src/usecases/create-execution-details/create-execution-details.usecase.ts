import { Injectable } from '@nestjs/common';
import { ExecutionDetailsRepository, ExecutionDetailsEntity } from '@novu/dal';
import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { EntityType, EventType, TraceLogRepository } from '../../services/analytic-logs/trace-log';

import { CreateExecutionDetailsResponseDto, mapExecutionDetailsCommandToEntity } from './dtos/execution-details.dto';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { LogRepository } from '../../services';
import { DetailEnum } from './types';

// Using satisfies ensures all DetailEnum values are mapped at compile time
const mapDetailToEventType = {
  // Step events
  [DetailEnum.STEP_CREATED]: 'step_created',
  [DetailEnum.STEP_QUEUED]: 'step_queued',
  [DetailEnum.STEP_DELAYED]: 'step_delayed',
  [DetailEnum.STEP_DIGESTED]: 'step_digested',
  [DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_WORKFLOW_PREFERENCES]: 'step_filtered',
  [DetailEnum.STEP_FILTERED_BY_SUBSCRIBER_GLOBAL_PREFERENCES]: 'step_filtered',
  [DetailEnum.STEP_FILTERED_BY_WORKFLOW_RESOURCE_PREFERENCES]: 'step_filtered',
  [DetailEnum.STEP_FILTERED_BY_USER_WORKFLOW_PREFERENCES]: 'step_filtered',
  [DetailEnum.FILTER_STEPS]: 'step_filtered',
  [DetailEnum.PROCESSING_STEP_FILTER]: 'step_filter_processing',
  [DetailEnum.PROCESSING_STEP_FILTER_ERROR]: 'step_filter_failed',

  // Message events
  [DetailEnum.MESSAGE_CREATED]: 'message_created',
  [DetailEnum.MESSAGE_SENT]: 'message_sent',
  [DetailEnum.MESSAGE_SNOOZED]: 'message_snoozed',
  [DetailEnum.MESSAGE_UNSNOOZED]: 'message_unsnoozed',
  [DetailEnum.MESSAGE_UNSNOOZE_FAILED]: 'message_unsnooze_failed',
  [DetailEnum.MESSAGE_CONTENT_NOT_GENERATED]: 'message_content_failed',
  [DetailEnum.MESSAGE_CONTENT_SYNTAX_ERROR]: 'message_content_failed',
  [DetailEnum.START_SENDING]: 'message_sending_started',

  // Subscriber events
  [DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION]: 'subscriber_integration_missing',
  [DetailEnum.SUBSCRIBER_NO_CHANNEL_DETAILS]: 'subscriber_channel_missing',
  [DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL]: 'subscriber_channel_missing',
  [DetailEnum.SUBSCRIBER_NOT_MEMBER_OF_ORGANIZATION]: 'subscriber_validation_failed',

  // Provider events
  [DetailEnum.PROVIDER_ERROR]: 'provider_error',
  [DetailEnum.LIMIT_PASSED_NOVU_INTEGRATION]: 'provider_limit_exceeded',

  // Digest events
  [DetailEnum.DIGEST_MERGED]: 'digest_merged',
  [DetailEnum.DIGEST_SKIPPED]: 'digest_skipped',
  [DetailEnum.DIGEST_TRIGGERED_EVENTS]: 'digest_triggered',
  [DetailEnum.START_DIGESTING]: 'digest_started',

  // Delay events
  [DetailEnum.DELAY_FINISHED]: 'delay_completed',
  [DetailEnum.DELAY_MISCONFIGURATION]: 'delay_misconfigured',
  [DetailEnum.DEFER_DURATION_LIMIT_EXCEEDED]: 'delay_limit_exceeded',

  // Bridge events
  [DetailEnum.SUCCESSFUL_BRIDGE_RESPONSE_RECEIVED]: 'bridge_response_received',
  [DetailEnum.FAILED_BRIDGE_EXECUTION]: 'bridge_execution_failed',

  // Webhook events
  [DetailEnum.WEBHOOK_FILTER_FAILED_RETRY]: 'webhook_filter_retrying',
  [DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY]: 'webhook_filter_failed',

  // Integration events
  [DetailEnum.INTEGRATION_INSTANCE_SELECTED]: 'integration_selected',
  [DetailEnum.LAYOUT_NOT_FOUND]: 'layout_not_found',

  // Tenant events
  [DetailEnum.TENANT_CONTEXT_SELECTED]: 'tenant_selected',
  [DetailEnum.TENANT_NOT_FOUND]: 'tenant_not_found',

  // Variant events
  [DetailEnum.VARIANT_CHOSEN]: 'variant_selected',

  // Notification events
  [DetailEnum.NOTIFICATION_ERROR]: 'notification_error',

  // Chat events
  [DetailEnum.CHAT_WEBHOOK_URL_MISSING]: 'chat_webhook_missing',
  [DetailEnum.CHAT_ALL_CHANNELS_FAILED]: 'chat_all_channels_failed',
  [DetailEnum.CHAT_MISSING_PHONE_NUMBER]: 'chat_phone_missing',

  // Push events
  [DetailEnum.PUSH_MISSING_DEVICE_TOKENS]: 'push_tokens_missing',

  // Reply/Inbound mail events
  [DetailEnum.REPLY_CALLBACK_MISSING_REPLAY_CALLBACK_URL]: 'reply_callback_missing',
  [DetailEnum.REPLY_CALLBACK_NOT_CONFIGURATION]: 'reply_callback_misconfigured',
  [DetailEnum.REPLY_CALLBACK_MISSING_MX_RECORD_CONFIGURATION]: 'reply_mx_record_missing',
  [DetailEnum.REPLY_CALLBACK_MISSING_MX_ROUTE_DOMAIN_CONFIGURATION]: 'reply_mx_domain_missing',
} satisfies Record<DetailEnum, EventType>;

@Injectable()
export class CreateExecutionDetails {
  constructor(
    private executionDetailsRepository: ExecutionDetailsRepository,
    private traceLogRepository: TraceLogRepository
  ) {}

  async execute(command: CreateExecutionDetailsCommand): Promise<CreateExecutionDetailsResponseDto> {
    let entity = mapExecutionDetailsCommandToEntity(command);

    entity = this.cleanFromNulls(entity);

    const { _id, createdAt } = await this.executionDetailsRepository.create(entity, { writeConcern: 1 });

    await this.createTraceLogEntry(command, createdAt);

    return {
      id: _id,
      createdAt,
    };
  }

  private cleanFromNulls(
    entity: Omit<ExecutionDetailsEntity, 'createdAt' | '_id'>
  ): Omit<ExecutionDetailsEntity, 'createdAt' | '_id'> {
    const cleanEntity = { ...entity };

    if (cleanEntity.raw === null) {
      delete cleanEntity.raw;
    }

    return cleanEntity;
  }

  private async createTraceLogEntry(command: CreateExecutionDetailsCommand, createdAt: string): Promise<void> {
    const traceData = {
      created_at: LogRepository.formatDateTime64(new Date(createdAt)),
      organization_id: command.organizationId,
      environment_id: command.environmentId,
      user_id: null,
      subscriber_id: command._subscriberId || null,
      external_subscriber_id: command.subscriberId || null,
      event_type: mapDetailToEventType[command.detail],
      title: command.detail,
      message: null,
      raw_data: command.raw || null,
      status: this.mapExecutionStatusToTraceStatus(command.status),
      entity_type: 'step_run' as EntityType,
      entity_id: command.jobId,
    };

    await this.traceLogRepository.create(traceData);
  }

  private mapExecutionStatusToTraceStatus(status: ExecutionDetailsStatusEnum): string {
    switch (status) {
      case ExecutionDetailsStatusEnum.SUCCESS:
        return 'success';
      case ExecutionDetailsStatusEnum.FAILED:
        return 'error';
      case ExecutionDetailsStatusEnum.PENDING:
        return 'pending';
      case ExecutionDetailsStatusEnum.WARNING:
        return 'warning';
      default:
        return 'unknown';
    }
  }
}
