import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';

import { WsQueueService } from '../services';

@Injectable()
export class WsQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'wsQueue';

  constructor(private wsQueueService: WsQueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const runningStatus =
      await this.wsQueueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Ws Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
