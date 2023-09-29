import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { StandardQueueService } from '../services';

const LOG_CONTEXT = 'StandardQueueServiceHealthIndicator';

@Injectable()
export class StandardQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'standardQueue';

  constructor(private standardQueueService: StandardQueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.standardQueueService.isReady();

    if (isReady) {
      Logger.verbose('StandardQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('StandardQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'Standard Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
