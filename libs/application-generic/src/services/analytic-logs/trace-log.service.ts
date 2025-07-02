import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { MessageEntity } from '@novu/dal';
import { TraceLogRepository } from './trace-log/trace-log.repository';
import { Trace } from './trace-log/trace-log.schema';
import { LogRepository } from './base.repository';

type TraceEvent =
  | 'message_seen'
  | 'message_unseen'
  | 'message_read'
  | 'message_unread'
  | 'message_archived'
  | 'message_unarchived'
  | 'message_snoozed'
  | 'message_unsnoozed';

@Injectable()
export class TraceLogService {
  constructor(
    private readonly traceLogRepository: TraceLogRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async run(message: MessageEntity, eventType: TraceEvent, userId?: string): Promise<void> {
    const traceData: Omit<Trace, 'id' | 'expires_at'> = {
      created_at: LogRepository.formatDateTime64(new Date()),
      organization_id: message._organizationId,
      environment_id: message._environmentId,
      user_id: userId || null,
      subscriber_id: message._subscriberId || null,
      event_type: eventType,
      title: this.mapEventTypeToTitle(eventType),
      message: `Message ${eventType.replace('message_', '')} for subscriber ${message._subscriberId}`,
      raw_data: null,
      status: 'success',
      entity_type: 'step_run',
      entity_id: message._jobId,
    };
    try {
      await this.traceLogRepository.insert(traceData, {
        organizationId: message._organizationId,
        environmentId: message._environmentId,
        userId,
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

  private mapEventTypeToTitle(eventType: TraceEvent): string {
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
}
