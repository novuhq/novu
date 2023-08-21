import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { StandardQueueService } from '../services';

const LOG_CONTEXT = 'StandardQueueServiceHealthIndicator';

@Injectable()
export class StandardQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'standardQueue';

  constructor(
    @Inject(StandardQueueService)
    private standardQueueService: StandardQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    Logger.log('Checking the health', LOG_CONTEXT);

    const runningStatus =
      await this.standardQueueService.bullMqService.getRunningStatus();

    Logger.warn({ runningStatus }, 'Running status', LOG_CONTEXT);

    if (!runningStatus.queueIsPaused) {
      Logger.log('StandardQueueService is not paused', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.log('StandardQueueService is paused', LOG_CONTEXT);

    throw new HealthCheckError(
      'Standard Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
