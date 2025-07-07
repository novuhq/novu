import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { LogRepository } from '../base.repository';
import { ClickHouseService } from '../clickhouse.service';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';
import { traceLogSchema, ORDER_BY, TABLE_NAME, Trace } from './trace-log.schema';

export type TraceEvent =
  | 'message_seen'
  | 'message_unseen'
  | 'message_read'
  | 'message_unread'
  | 'message_archived'
  | 'message_unarchived'
  | 'message_snoozed'
  | 'message_unsnoozed';

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

export function mapEventTypeToTitle(eventType: TraceEvent): string {
  switch (eventType) {
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
    default:
      // Exhaustive check - this will cause a compile error if we miss any TraceEvent cases
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = eventType;

      return _exhaustiveCheck;
  }
}
