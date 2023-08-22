import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { InboundParseQueueService } from '../services';

const LOG_CONTEXT = 'InboundParseQueueServiceHealthIndicator';

@Injectable()
export class InboundParseQueueServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'inboundParseQueue';

  constructor(
    @Inject(InboundParseQueueService)
    private inboundParseQueueService: InboundParseQueueService
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.inboundParseQueueService.isReady();

    if (isReady) {
      Logger.verbose('InboundParseQueueService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('InboundParseQueueService is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'InboundParse Queue Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
