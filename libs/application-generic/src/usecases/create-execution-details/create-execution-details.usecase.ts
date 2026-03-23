import { Injectable } from '@nestjs/common';
import { ExecutionDetailsEntity, ExecutionDetailsRepository } from '@novu/dal';
import { ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { Instrument } from '../../instrumentation';
import { FeatureFlagsService, LogRepository, StepType } from '../../services';
import { EventType, StepRunTraceInput, TraceLogRepository, TraceStatus } from '../../services/analytic-logs/trace-log';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { mapExecutionDetailsCommandToEntity } from './dtos/execution-details.dto';
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
  [DetailEnum.PROCESSING_STEP_FILTER]: 'step_filter_processing',
  [DetailEnum.PROCESSING_STEP_FILTER_ERROR]: 'step_filter_failed',

  // Message events
  [DetailEnum.MESSAGE_CREATED]: 'message_created',
  [DetailEnum.MESSAGE_SENT]: 'message_sent',
  [DetailEnum.MESSAGE_SEEN]: 'message_seen',
  [DetailEnum.MESSAGE_READ]: 'message_read',
  [DetailEnum.MESSAGE_CLICKED]: 'message_clicked',
  [DetailEnum.MESSAGE_DELIVERED]: 'message_delivered',
  [DetailEnum.MESSAGE_REJECTED]: 'message_rejected',
  [DetailEnum.MESSAGE_BLOCKED]: 'message_blocked',
  [DetailEnum.MESSAGE_SPAM]: 'message_spam',
  [DetailEnum.MESSAGE_BOUNCED]: 'message_bounced',
  [DetailEnum.MESSAGE_DROPPED]: 'message_dropped',
  [DetailEnum.MESSAGE_DEFERRED]: 'message_deferred',
  [DetailEnum.MESSAGE_UNSUBSCRIBED]: 'message_unsubscribed',
  [DetailEnum.MESSAGE_DELAYED]: 'message_delayed',
  [DetailEnum.MESSAGE_COMPLAINT]: 'message_complaint',
  [DetailEnum.MESSAGE_SNOOZED]: 'message_snoozed',
  [DetailEnum.MESSAGE_UNSNOOZED]: 'message_unsnoozed',
  [DetailEnum.MESSAGE_UNSNOOZE_FAILED]: 'message_unsnooze_failed',
  [DetailEnum.MESSAGE_CONTENT_NOT_GENERATED]: 'message_content_failed',
  [DetailEnum.MESSAGE_CONTENT_SYNTAX_ERROR]: 'message_content_failed',
  [DetailEnum.MESSAGE_SEVERITY_OVERRIDDEN]: 'message_severity_overridden',

  // Subscriber events
  [DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION]: 'subscriber_integration_missing',
  [DetailEnum.SUBSCRIBER_MISSING_EMAIL_ADDRESS]: 'subscriber_missing_email_address',
  [DetailEnum.SUBSCRIBER_MISSING_PHONE_NUMBER]: 'subscriber_missing_phone_number',
  [DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL]: 'subscriber_channel_missing',
  [DetailEnum.SUBSCRIBER_CONTEXT_NO_ACTIVE_CHANNEL]: 'subscriber_context_channel_missing',
  [DetailEnum.SUBSCRIBER_NOT_MEMBER_OF_ORGANIZATION]: 'subscriber_validation_failed',

  // Provider events
  [DetailEnum.PROVIDER_MISSING]: 'provider_missing',
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

  // Throttle events
  [DetailEnum.STEP_THROTTLED]: 'step_throttled',
  [DetailEnum.THROTTLE_LIMIT_EXCEEDED]: 'throttle_limit_exceeded',
  [DetailEnum.THROTTLE_WINDOW_IN_PAST]: 'throttle_window_in_past',

  // Workflow events
  [DetailEnum.STEP_COMPLETED]: 'step_completed',
  [DetailEnum.STEP_PROCESSED]: 'step_processed',

  // Action step events
  [DetailEnum.ACTION_STEP_EXECUTION_FAILED]: 'action_step_execution_failed',
  [DetailEnum.ACTION_STEP_NON_OBJECT_RESPONSE]: 'action_step_execution_failed',
  [DetailEnum.RESPONSE_SCHEMA_VALIDATION_FAILED]: 'action_step_execution_failed',

  // Bridge events
  [DetailEnum.FAILED_BRIDGE_EXECUTION]: 'bridge_execution_failed',
  [DetailEnum.SKIPPED_BRIDGE_EXECUTION]: 'bridge_execution_skipped',

  // Step resolver events
  [DetailEnum.FAILED_STEP_RESOLVER_EXECUTION]: 'step_resolver_execution_failed',
  [DetailEnum.STEP_RESOLVER_EXECUTION_TIMEOUT]: 'step_resolver_execution_timeout',

  // Webhook events
  [DetailEnum.WEBHOOK_FILTER_FAILED_RETRY]: 'webhook_filter_retrying',
  [DetailEnum.WEBHOOK_FILTER_FAILED_LAST_RETRY]: 'webhook_filter_failed',

  // Integration events
  [DetailEnum.INTEGRATION_INSTANCE_SELECTED]: 'integration_selected',

  // Layout events
  [DetailEnum.LAYOUT_NOT_FOUND]: 'layout_not_found',
  [DetailEnum.LAYOUT_SELECTED]: 'layout_selected',

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
  [DetailEnum.CHAT_SOME_CHANNELS_SKIPPED]: 'chat_some_channels_skipped',

  // MS Teams events
  [DetailEnum.MSTEAMS_BOT_NOT_INSTALLED]: 'msteams_bot_not_installed',
  [DetailEnum.MSTEAMS_CHANNEL_NOT_FOUND]: 'msteams_channel_not_found',
  [DetailEnum.MSTEAMS_USER_NOT_FOUND]: 'msteams_user_not_found',
  [DetailEnum.MSTEAMS_INSUFFICIENT_PERMISSIONS]: 'msteams_insufficient_permissions',
  [DetailEnum.MSTEAMS_TENANT_NOT_CONSENTED]: 'msteams_tenant_not_consented',
  [DetailEnum.MSTEAMS_INVALID_CREDENTIALS]: 'msteams_invalid_credentials',

  // Push events
  [DetailEnum.PUSH_MISSING_DEVICE_TOKENS]: 'push_tokens_missing',
  [DetailEnum.PUSH_SOME_CHANNELS_SKIPPED]: 'push_some_channels_skipped',

  // Reply/Inbound mail events
  [DetailEnum.REPLY_CALLBACK_MISSING_REPLAY_CALLBACK_URL]: 'reply_callback_missing',
  [DetailEnum.REPLY_CALLBACK_NOT_CONFIGURATION]: 'reply_callback_misconfigured',
  [DetailEnum.REPLY_CALLBACK_MISSING_MX_RECORD_CONFIGURATION]: 'reply_mx_record_missing',
  [DetailEnum.REPLY_CALLBACK_MISSING_MX_ROUTE_DOMAIN_CONFIGURATION]: 'reply_mx_domain_missing',

  // Skipped step events
  [DetailEnum.SKIPPED_STEP_BY_CONDITIONS]: 'step_skipped',
  [DetailEnum.SKIPPED_STEP_OUTSIDE_OF_THE_SCHEDULE]: 'step_skipped_outside_of_the_schedule',
  [DetailEnum.STEP_EXTENDED_TO_SCHEDULE]: 'step_extended_to_schedule',
  [DetailEnum.SKIPPED_STEP_MAX_EXTENSIONS_REACHED]: 'step_skipped_max_extensions_reached',
  [DetailEnum.PUSH_INVALID_TOKEN_REMOVED]: 'push_invalid_token_removed',

  [DetailEnum.TOPIC_SUBSCRIPTION_PREFERENCE_EVALUATION]: 'topic_subscription_preference_evaluation',
  [DetailEnum.STEP_CANCELED]: 'step_canceled',
} satisfies Record<DetailEnum, EventType>;

@Injectable()
export class CreateExecutionDetails {
  constructor(
    private executionDetailsRepository: ExecutionDetailsRepository,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @Instrument()
  async execute(command: CreateExecutionDetailsCommand): Promise<void> {
    const isClickhouseOnlyEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
    });
    let entity = mapExecutionDetailsCommandToEntity(command);

    entity = this.cleanFromNulls(entity);

    if (!isClickhouseOnlyEnabled) {
      await this.executionDetailsRepository.create(entity, { writeConcern: 1 });
    }

    await this.createTraceLogEntry(command, new Date().toISOString());
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
    // Handle dynamic provider selection messages
    const eventType = this.getEventType(command.detail);

    const traceData: StepRunTraceInput = {
      created_at: LogRepository.formatDateTime64(new Date(createdAt)),
      organization_id: command.organizationId,
      environment_id: command.environmentId,
      user_id: null,
      subscriber_id: command._subscriberId || null,
      external_subscriber_id: command.subscriberId || null,
      event_type: eventType,
      title: command.detail,
      message: null,
      raw_data: command.raw || null,
      status: this.mapExecutionStatusToTraceStatus(command.status),
      entity_id: command.jobId,
      step_run_type: command.channel as StepType,
      workflow_run_identifier: command.workflowRunIdentifier,
      workflow_id: command.notificationTemplateId,
      provider_id: command.providerId || null,
    };

    await this.traceLogRepository.createStepRun([traceData]);
  }

  private getEventType(detail: string): EventType {
    // Check if it's a provider selection message
    if (detail.includes('provider was selected')) {
      return 'integration_selected';
    }

    // Use the standard mapping for enum values
    return mapDetailToEventType[detail as DetailEnum];
  }

  private mapExecutionStatusToTraceStatus(status: ExecutionDetailsStatusEnum): TraceStatus {
    switch (status) {
      case ExecutionDetailsStatusEnum.SUCCESS:
        return 'success';
      case ExecutionDetailsStatusEnum.FAILED:
        return 'error';
      case ExecutionDetailsStatusEnum.PENDING:
        return 'pending';
      case ExecutionDetailsStatusEnum.WARNING:
        return 'warning';
    }
  }
}
