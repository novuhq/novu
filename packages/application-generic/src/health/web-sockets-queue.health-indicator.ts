import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable } from '@nestjs/common';

import { WebSocketsQueueService } from '../services';

@Injectable()
export class WebSocketsQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'webSocketsQueue';

  constructor(
    @Inject(WebSocketsQueueService)
    private webSocketsQueueService: WebSocketsQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const runningStatus =
      await this.webSocketsQueueService.bullMqService.getRunningStatus();

    if (!runningStatus.queueIsPaused) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Ws Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
