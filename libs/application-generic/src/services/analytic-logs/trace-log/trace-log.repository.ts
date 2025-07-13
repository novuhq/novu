import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { LogRepository } from '../log.repository';
import { ClickHouseService } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { traceLogSchema, ORDER_BY, TABLE_NAME, Trace, EventType } from './trace-log.schema';

@Injectable()
export class TraceLogRepository extends LogRepository<typeof traceLogSchema> {
  public readonly table = TABLE_NAME;
  public readonly identifierPrefix = 'trc_';

  constructor(
    protected readonly clickhouseService: ClickHouseService,
    protected readonly logger: PinoLogger,
    protected readonly featureFlagsService: FeatureFlagsService
  ) {
    super(clickhouseService, logger, traceLogSchema, ORDER_BY, featureFlagsService);
    this.logger.setContext(this.constructor.name);
  }

  async create(traceData: Omit<Trace, 'id' | 'expires_at'>): Promise<void> {
    try {
      const isTraceLogsEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_TRACE_LOGS_ENABLED,
        defaultValue: false,
        organization: { _id: traceData.organization_id },
        user: { _id: traceData.user_id },
        environment: { _id: traceData.environment_id },
      });

      if (!isTraceLogsEnabled) {
        return;
      }

      await this.insert(traceData, {
        organizationId: traceData.organization_id,
        environmentId: traceData.environment_id,
        userId: traceData.user_id,
      });

      this.logger.debug(
        {
          entityId: traceData.entity_id,
          entityType: traceData.entity_type,
          eventType: traceData.event_type,
        },
        'Trace event logged'
      );
    } catch (error) {
      this.logger.error(
        {
          error,
          entityId: traceData.entity_id,
          entityType: traceData.entity_type,
          eventType: traceData.event_type,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to log trace event'
      );
      // Don't rethrow to avoid breaking the main flow
    }
  }

  async createMany(traceDataArray: Omit<Trace, 'id' | 'expires_at'>[]): Promise<void> {
    if (traceDataArray.length === 0) {
      return;
    }

    try {
      const firstTraceData = traceDataArray[0];
      const isTraceLogsEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_TRACE_LOGS_ENABLED,
        defaultValue: false,
        organization: { _id: firstTraceData.organization_id },
        user: { _id: firstTraceData.user_id },
        environment: { _id: firstTraceData.environment_id },
      });

      if (!isTraceLogsEnabled) {
        return;
      }

      await this.insertMany(traceDataArray, {
        organizationId: firstTraceData.organization_id,
        environmentId: firstTraceData.environment_id,
        userId: firstTraceData.user_id,
      });

      this.logger.debug(
        {
          count: traceDataArray.length,
          entityIds: traceDataArray.map((trace) => trace.entity_id),
          entityTypes: [...new Set(traceDataArray.map((trace) => trace.entity_type))],
          eventTypes: [...new Set(traceDataArray.map((trace) => trace.event_type))],
        },
        'Trace events logged in batch'
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
          count: traceDataArray.length,
          entityIds: traceDataArray.map((trace) => trace.entity_id),
          entityTypes: [...new Set(traceDataArray.map((trace) => trace.entity_type))],
          eventTypes: [...new Set(traceDataArray.map((trace) => trace.event_type))],
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to log trace events in batch'
      );
    }
  }
}

export function mapEventTypeToTitle(eventType: EventType): string {
  switch (eventType) {
    // Step events
    case 'step_created':
      return 'Step Created';
    case 'step_queued':
      return 'Step Queued';
    case 'step_delayed':
      return 'Step Delayed';
    case 'step_digested':
      return 'Step Digested';
    case 'step_filtered':
      return 'Step Filtered';
    case 'step_filter_processing':
      return 'Step Filter Processing';
    case 'step_filter_failed':
      return 'Step Filter Failed';

    // Message events
    case 'message_created':
      return 'Message Created';
    case 'message_sent':
      return 'Message Sent';
    case 'message_seen':
      return 'Message Seen';
    case 'message_unseen':
      return 'Message Unseen';
    case 'message_read':
      return 'Message Read';
    case 'message_unread':
      return 'Message Unread';
    case 'message_archived':
      return 'Message Archived';
    case 'message_unarchived':
      return 'Message Unarchived';
    case 'message_snoozed':
      return 'Message Snoozed';
    case 'message_unsnoozed':
      return 'Message Unsnoozed';
    case 'message_unsnooze_failed':
      return 'Message Unsnooze Failed';
    case 'message_content_failed':
      return 'Message Content Failed';
    case 'message_sending_started':
      return 'Message Sending Started';

    // Subscriber events
    case 'subscriber_integration_missing':
      return 'Subscriber Integration Missing';
    case 'subscriber_channel_missing':
      return 'Subscriber Channel Missing';
    case 'subscriber_validation_failed':
      return 'Subscriber Validation Failed';

    // Provider events
    case 'provider_error':
      return 'Provider Error';
    case 'provider_limit_exceeded':
      return 'Provider Limit Exceeded';

    // Digest events
    case 'digest_merged':
      return 'Digest Merged';
    case 'digest_skipped':
      return 'Digest Skipped';
    case 'digest_triggered':
      return 'Digest Triggered';
    case 'digest_started':
      return 'Digest Started';

    // Delay events
    case 'delay_completed':
      return 'Delay Completed';
    case 'delay_misconfigured':
      return 'Delay Misconfigured';
    case 'delay_limit_exceeded':
      return 'Delay Limit Exceeded';

    // Bridge events
    case 'bridge_response_received':
      return 'Bridge Response Received';
    case 'bridge_execution_failed':
      return 'Bridge Execution Failed';

    // Webhook events
    case 'webhook_filter_retrying':
      return 'Webhook Filter Retrying';
    case 'webhook_filter_failed':
      return 'Webhook Filter Failed';

    // Integration events
    case 'integration_selected':
      return 'Integration Selected';
    case 'layout_not_found':
      return 'Layout Not Found';

    // Tenant events
    case 'tenant_selected':
      return 'Tenant Selected';
    case 'tenant_not_found':
      return 'Tenant Not Found';

    // Variant events
    case 'variant_selected':
      return 'Variant Selected';

    // Notification events
    case 'notification_error':
      return 'Notification Error';

    // Chat events
    case 'chat_webhook_missing':
      return 'Chat Webhook Missing';
    case 'chat_all_channels_failed':
      return 'Chat All Channels Failed';
    case 'chat_phone_missing':
      return 'Chat Phone Missing';

    // Push events
    case 'push_tokens_missing':
      return 'Push Tokens Missing';

    // Reply events
    case 'reply_callback_missing':
      return 'Reply Callback Missing';
    case 'reply_callback_misconfigured':
      return 'Reply Callback Misconfigured';
    case 'reply_mx_record_missing':
      return 'Reply MX Record Missing';
    case 'reply_mx_domain_missing':
      return 'Reply MX Domain Missing';

    // Execution events
    case 'execution_detail':
      return 'Execution Detail';

    default:
      // Exhaustive check - this will cause a compile error if we miss any TraceEvent cases
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = eventType;

      return _exhaustiveCheck;
  }
}
