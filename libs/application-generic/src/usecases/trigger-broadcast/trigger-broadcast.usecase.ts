import { Injectable } from '@nestjs/common';

import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { SubscriberSourceEnum } from '@novu/shared';

import { PinoLogger } from 'nestjs-pino';
import { InstrumentUsecase } from '../../instrumentation';
import { CacheService, FeatureFlagsService } from '../../services';
import type { EventType, Trace } from '../../services/analytic-logs';
import { LogRepository, mapEventTypeToTitle, TraceLogRepository } from '../../services/analytic-logs';
import { SubscriberProcessQueueService } from '../../services/queues/subscriber-process-queue.service';
import { TriggerBase } from '../trigger-base';
import { TriggerBroadcastCommand } from './trigger-broadcast.command';

const QUEUE_CHUNK_SIZE = Number(process.env.BROADCAST_QUEUE_CHUNK_SIZE) || 100;

@Injectable()
export class TriggerBroadcast extends TriggerBase {
  constructor(
    private subscriberRepository: SubscriberRepository,
    protected subscriberProcessQueueService: SubscriberProcessQueueService,
    protected cacheService: CacheService,
    protected featureFlagsService: FeatureFlagsService,
    protected logger: PinoLogger,
    private traceLogRepository: TraceLogRepository
  ) {
    super(subscriberProcessQueueService, cacheService, featureFlagsService, logger, QUEUE_CHUNK_SIZE);
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: TriggerBroadcastCommand) {
    try {
      const subscriberFetchBatchSize = 500;
      let subscribers: SubscriberEntity[] = [];
      let totalProcessed = 0;

      for await (const subscriber of this.subscriberRepository.findBatch(
        {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        'subscriberId',
        {},
        subscriberFetchBatchSize
      )) {
        subscribers.push(subscriber);
        if (subscribers.length === subscriberFetchBatchSize) {
          await this.sendToProcessSubscriberService(command, subscribers, SubscriberSourceEnum.BROADCAST);
          totalProcessed += subscribers.length;
          subscribers = [];
        }
      }

      await this.createBroadcastTrace(
        command,
        'request_subscriber_processing_completed',
        'success',
        'Subscriber processing completed successfully',
        {
          addressingType: 'broadcast',
          workflowId: command.template._id,
          totalSubscribers: totalProcessed,
        }
      );

      if (subscribers.length > 0) {
        await this.sendToProcessSubscriberService(command, subscribers, SubscriberSourceEnum.BROADCAST);
        totalProcessed += subscribers.length;
      }
    } catch (e) {
      const error = e as Error;
      await this.createBroadcastTrace(
        command,
        'request_failed',
        'error',
        `Broadcast processing failed: ${error.message || 'Unknown error'}`,
        {
          addressingType: 'broadcast',
          workflowId: command.template._id,
          error: error.message,
          stack: error.stack,
        }
      );

      this.logger.error(
        {
          transactionId: command.transactionId,
          organization: command.organizationId,
          triggerIdentifier: command.identifier,
          userId: command.userId,
          error: e,
        },
        'Unexpected error has occurred when processing broadcast'
      );

      throw e;
    }
  }

  private async createBroadcastTrace(
    command: TriggerBroadcastCommand,
    eventType: EventType,
    status: 'success' | 'error' | 'warning' = 'success',
    message?: string,
    rawData?: any
  ): Promise<void> {
    if (!command.requestId) {
      return;
    }

    try {
      const traceData: Omit<Trace, 'id' | 'expires_at'> = {
        created_at: LogRepository.formatDateTime64(new Date()),
        organization_id: command.organizationId,
        environment_id: command.environmentId,
        user_id: command.userId,
        subscriber_id: null,
        external_subscriber_id: null,
        event_type: eventType,
        title: mapEventTypeToTitle(eventType),
        message: message || null,
        raw_data: rawData ? JSON.stringify(rawData) : null,
        status,
        entity_type: 'request',
        entity_id: command.requestId,
        workflow_run_identifier: command.template.triggers[0].identifier,
      };

      await this.traceLogRepository.createRequest([traceData]);
    } catch (error) {
      this.logger.error(
        {
          error,
          eventType,
          transactionId: command.transactionId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        },
        'Failed to create broadcast trace'
      );
    }
  }
}
