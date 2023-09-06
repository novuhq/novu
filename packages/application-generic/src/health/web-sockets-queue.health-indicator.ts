import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { WebSocketsQueueService } from '../services';

const LOG_CONTEXT = 'WebSocketsQueueServiceHealthIndicator';

@Injectable()
export class WebSocketsQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'webSocketsQueue';

  constructor(private webSocketsQueueService: WebSocketsQueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.webSocketsQueueService.isReady();

    if (isReady) {
      Logger.verbose('WebSocketsQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('WebSocketsQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'Ws Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
