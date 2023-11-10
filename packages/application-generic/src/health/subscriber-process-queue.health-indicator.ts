import { Injectable } from '@nestjs/common';

import { SubscriberProcessQueueService } from '../services/queues';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';
import { QueueHealthIndicator } from './queue-health-indicator.service';

const LOG_CONTEXT = 'SubscriberProcessQueueHealthIndicator';
const INDICATOR_KEY =
  ObservabilityBackgroundTransactionEnum.SUBSCRIBER_PROCESSING_QUEUE;
const SERVICE_NAME = 'SubscriberProcessQueueService';

@Injectable()
export class SubscriberProcessQueueHealthIndicator extends QueueHealthIndicator {
  constructor(
    private subscriberProcessQueueService: SubscriberProcessQueueService
  ) {
    super(
      subscriberProcessQueueService,
      INDICATOR_KEY,
      SERVICE_NAME,
      LOG_CONTEXT
    );
  }
}
