import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

import { TriggerQueueService } from '../services';

@Injectable()
export class TriggerQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'triggerQueue';

  constructor(private triggerQueueService: TriggerQueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const runningStatus =
      await this.triggerQueueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Trigger Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
