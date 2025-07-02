import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { MessageEntity } from '@novu/dal';
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
