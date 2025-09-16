import { Injectable } from '@nestjs/common';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { ClickHouseService, InsertOptions } from '../clickhouse.service';
import { LogRepository } from '../log.repository';
import { getInsertOptions } from '../shared';
import { EventType, ORDER_BY, TABLE_NAME, Trace, traceLogSchema } from './trace-log.schema';

const TRACE_INSERT_OPTIONS: InsertOptions = getInsertOptions(
  process.env.TRACES_ASYNC_INSERT,
  process.env.TRACES_WAIT_ASYNC_INSERT
);

@Injectable()
export class TraceLogRepository extends LogRepository<typeof traceLogSchema, Trace> {
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

  private async createMany(traceDataArray: Omit<Trace, 'id' | 'expires_at'>[]): Promise<void> {
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

      await this.insertMany(
        traceDataArray,
        {
          organizationId: firstTraceData.organization_id,
          environmentId: firstTraceData.environment_id,
          userId: firstTraceData.user_id,
        },
        TRACE_INSERT_OPTIONS
      );

      this.logger.debug(
        {
          count: traceDataArray.length,
          entityIds: traceDataArray.map((trace) => trace.entity_id),
          entityTypes: [...new Set(traceDataArray.map((trace) => trace.entity_type))],
          eventTypes: [...new Set(traceDataArray.map((trace) => trace.event_type))],
        },
        'Trace events logged'
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
        'Failed to log trace events'
      );
    }
  }

  async createStepRun(traceData: Omit<Trace, 'id' | 'expires_at' | 'entity_type'>[]): Promise<void> {
    return this.createMany(
      traceData.map((trace) => ({
        ...trace,
        entity_type: 'step_run',
      }))
    );
  }

  async createRequest(traceData: Omit<Trace, 'id' | 'expires_at' | 'entity_type'>[]): Promise<void> {
    return this.createMany(
      traceData.map((trace) => ({
        ...trace,
        entity_type: 'request',
      }))
    );
  }

  async getInteractionTrendData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: string; event_type: string; count: string }>> {
    const query = `
      SELECT 
        toDate(traces.created_at) as date,
        traces.event_type,
        count(*) as count
      FROM traces
      WHERE 
        traces.environment_id = {environmentId:String} 
        AND traces.organization_id = {organizationId:String}
        AND traces.entity_type = 'step_run'
        AND traces.created_at >= {startDate:DateTime64(3)}
        AND traces.created_at <= {endDate:DateTime64(3)}
        AND traces.event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived')
      GROUP BY date, traces.event_type
      ORDER BY date, traces.event_type
    `;

    const params = {
      environmentId,
      organizationId,
      startDate: LogRepository.formatDateTime64(startDate),
      endDate: LogRepository.formatDateTime64(endDate),
    };

    const result = await this.clickhouseService.query<{
      date: string;
      event_type: string;
      count: string;
    }>({
      query,
      params,
    });

    return result.data;
  }

  async getTotalInteractionsData(
    environmentId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date,
    previousStartDate: Date,
    previousEndDate: Date
  ): Promise<{ currentPeriod: number; previousPeriod: number }> {
    const currentQuery = `
      SELECT count(*) as count
      FROM traces
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {startDate:DateTime64(3)}
        AND created_at <= {endDate:DateTime64(3)}
        AND entity_type = 'step_run'
        AND event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived')
    `;

    const previousQuery = `
      SELECT count(*) as count
      FROM traces
      WHERE 
        environment_id = {environmentId:String} 
        AND organization_id = {organizationId:String}
        AND created_at >= {previousStartDate:DateTime64(3)}
        AND created_at <= {previousEndDate:DateTime64(3)}
        AND entity_type = 'step_run'
        AND event_type IN ('message_seen', 'message_read', 'message_snoozed', 'message_archived')
    `;

    const currentParams = {
      environmentId,
      organizationId,
      startDate: LogRepository.formatDateTime64(startDate),
      endDate: LogRepository.formatDateTime64(endDate),
    };

    const previousParams = {
      environmentId,
      organizationId,
      previousStartDate: LogRepository.formatDateTime64(previousStartDate),
      previousEndDate: LogRepository.formatDateTime64(previousEndDate),
    };

    const [currentResult, previousResult] = await Promise.all([
      this.clickhouseService.query<{ count: string }>({
        query: currentQuery,
        params: currentParams,
      }),
      this.clickhouseService.query<{ count: string }>({
        query: previousQuery,
        params: previousParams,
      }),
    ]);

    const currentPeriod = parseInt(currentResult.data[0]?.count || '0', 10);
    const previousPeriod = parseInt(previousResult.data[0]?.count || '0', 10);

    return {
      currentPeriod,
      previousPeriod,
    };
  }
}

export function mapEventTypeToTitle(eventType: EventType): string {
  switch (eventType) {
    // Step events
    case 'step_created':
      return 'Step created';
    case 'step_queued':
      return 'Step queued';
    case 'step_delayed':
      return 'Step delayed';
    case 'step_digested':
      return 'Step digested';
    case 'step_filtered':
      return 'Step filtered';
    case 'step_filter_processing':
      return 'Step filter processing';
    case 'step_filter_failed':
      return 'Step filter failed';
    case 'step_completed':
      return 'Step completed';

    // Message events
    case 'message_created':
      return 'Message created';
    case 'message_sent':
      return 'Message sent';
    case 'message_seen':
      return 'Message seen';
    case 'message_unseen':
      return 'Message unseen';
    case 'message_read':
      return 'Message read';
    case 'message_unread':
      return 'Message unread';
    case 'message_archived':
      return 'Message archived';
    case 'message_unarchived':
      return 'Message unarchived';
    case 'message_snoozed':
      return 'Message snoozed';
    case 'message_unsnoozed':
      return 'Message unsnoozed';
    case 'message_unsnooze_failed':
      return 'Message unsnooze failed';
    case 'message_content_failed':
      return 'Message content failed';
    case 'message_sending_started':
      return 'Message sending started';
    case 'message_severity_overridden':
      return 'Severity for the message was overridden';
    case 'message_clicked':
      return 'Message clicked';
    case 'message_spam':
      return 'Message spam';
    case 'message_bounced':
      return 'Message bounced';
    case 'message_dropped':
      return 'Message dropped';
    case 'message_deferred':
      return 'Message deferred';
    case 'message_unsubscribed':
      return 'Message unsubscribed';
    case 'message_delayed':
      return 'Message delayed';
    case 'message_deleted':
      return 'Message deleted';
    case 'message_complaint':
      return 'Message complaint';
    case 'message_delivered':
      return 'Message delivered';
    case 'message_rejected':
      return 'Message rejected';
    case 'message_blocked':
      return 'Message blocked';

    // Subscriber events
    case 'subscriber_integration_missing':
      return 'Subscriber integration missing';
    case 'subscriber_channel_missing':
      return 'Subscriber channel missing';
    case 'subscriber_validation_failed':
      return 'Subscriber validation failed';
    case 'subscriber_missing_email_address':
      return 'Subscriber missing email address';
    case 'subscriber_missing_phone_number':
      return 'Subscriber missing phone number';

    // Provider events
    case 'provider_error':
      return 'Provider error';
    case 'provider_limit_exceeded':
      return 'Provider limit exceeded';

    // Digest events
    case 'digest_merged':
      return 'Digest merged';
    case 'digest_skipped':
      return 'Digest skipped';
    case 'digest_triggered':
      return 'Digest triggered';
    case 'digest_started':
      return 'Digest started';

    // Delay events
    case 'delay_completed':
      return 'Delay completed';
    case 'delay_misconfigured':
      return 'Delay misconfigured';
    case 'delay_limit_exceeded':
      return 'Delay limit exceeded';

    // Bridge events
    case 'bridge_response_received':
      return 'Bridge response received';
    case 'bridge_execution_failed':
      return 'Bridge execution failed';
    case 'bridge_execution_skipped':
      return 'Bridge execution skipped';

    // Webhook events
    case 'webhook_filter_retrying':
      return 'Webhook filter retrying';
    case 'webhook_filter_failed':
      return 'Webhook filter failed';

    // Integration events
    case 'integration_selected':
      return 'Integration selected';

    // Layout events
    case 'layout_not_found':
      return 'Layout not found';
    case 'layout_selected':
      return 'Layout selected';

    // Tenant events
    case 'tenant_selected':
      return 'Tenant selected';
    case 'tenant_not_found':
      return 'Tenant not found';

    // Variant events
    case 'variant_selected':
      return 'Variant selected';

    // Notification events
    case 'notification_error':
      return 'Notification error';

    // Chat events
    case 'chat_webhook_missing':
      return 'Chat webhook missing';
    case 'chat_all_channels_failed':
      return 'Chat all channels failed';
    case 'chat_phone_missing':
      return 'Chat phone missing';
    case 'chat_some_channels_skipped':
      return 'Chat some channels skipped';

    // Push events
    case 'push_tokens_missing':
      return 'Push tokens missing';
    case 'push_some_channels_skipped':
      return 'Push some channels skipped';

    // Reply events
    case 'reply_callback_missing':
      return 'Reply callback missing';
    case 'reply_callback_misconfigured':
      return 'Reply callback misconfigured';
    case 'reply_mx_record_missing':
      return 'Reply MX record missing';
    case 'reply_mx_domain_missing':
      return 'Reply MX domain missing';

    // Execution events
    case 'execution_detail':
      return 'Execution detail';

    // Request events
    case 'request_received':
      return 'Request received';
    case 'request_queued':
      return 'Request queued';
    case 'request_failed':
      return 'Request failed';
    case 'request_organization_not_found':
      return 'Organization not found';
    case 'request_environment_not_found':
      return 'Environment not found';
    case 'request_workflow_not_found':
      return 'Workflow not found';
    case 'request_invalid_recipients':
      return 'Invalid recipients';
    case 'request_payload_validation_failed':
      return 'Payload validation failed';

    // Workflow events
    case 'workflow_execution_started':
      return 'Workflow execution started';
    case 'workflow_environment_not_found':
      return 'Workflow environment not found';
    case 'workflow_template_not_found':
      return 'Workflow template not found';
    case 'workflow_template_found':
      return 'Workflow template found';
    case 'workflow_tenant_processing_started':
      return 'Workflow tenant processing started';
    case 'workflow_tenant_processing_failed':
      return 'Workflow tenant processing failed';
    case 'workflow_tenant_processing_completed':
      return 'Workflow tenant processing completed';
    case 'workflow_actor_processing_started':
      return 'Workflow actor processing started';
    case 'workflow_actor_processing_completed':
      return 'Workflow actor processing completed';
    case 'workflow_execution_failed':
      return 'Workflow execution failed';
    case 'workflow_actor_processing_failed':
      return 'Workflow actor processing failed';
    case 'workflow_context_resolution_completed':
      return 'Workflow context resolution completed';
    case 'workflow_context_resolution_failed':
      return 'Workflow context resolution failed';
    case 'workflow_context_not_found':
      return 'Workflow context not found';

    // Request fan-out events
    case 'request_subscriber_processing_completed':
      return 'Request subscriber processing completed';

    // Topic events
    case 'topic_not_found':
      return 'Topic not found';

    // Step skipped events
    case 'step_skipped':
      return 'Step skipped';
    case 'step_skipped_outside_of_the_schedule':
      return "The step was skipped as it fell outside the subscriber's schedule";
    case 'step_extended_to_schedule':
      return 'Step was extended to the next available time in the subscriber schedule';
    case 'step_skipped_max_extensions_reached':
      return 'Step was executed due to maximum number of subscriber schedule extensions reached';

    default: {
      // Exhaustive check - this will cause a compile error if we miss any TraceEvent cases
      const _exhaustiveCheck: never = eventType;

      return _exhaustiveCheck;
    }
  }
}
