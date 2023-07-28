import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable } from '@nestjs/common';

import { StandardQueueService } from '../services';

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
    const runningStatus =
      await this.standardQueueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Standard Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
