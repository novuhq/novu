import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { SubscriberProcessQueueService } from '../services';
import { ObservabilityBackgroundTransactionEnum } from '@novu/shared';

const LOG_CONTEXT = 'SubscriberProcessQueueHealthIndicator';

@Injectable()
export class SubscriberProcessQueueHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY =
    ObservabilityBackgroundTransactionEnum.SUBSCRIBER_PROCESSING_QUEUE;

  constructor(
    private subscriberProcessQueueService: SubscriberProcessQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.subscriberProcessQueueService.isReady();

    if (isReady) {
      Logger.verbose('SubscriberProcessQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('SubscriberProcessQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'Subscriber Process Queue Service Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
