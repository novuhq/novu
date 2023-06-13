import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

import { QueueService } from '../services';

@Injectable()
export class QueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'queue';

  constructor(private queueService: QueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const runningStatus =
      await this.queueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
