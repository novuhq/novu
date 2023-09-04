import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '../services';

const LOG_CONTEXT = 'CacheServiceHealthIndicator';

@Injectable()
export class CacheServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'cacheService';

  constructor(private cacheService: CacheService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isReady = this.cacheService.cacheEnabled();

    if (isReady) {
      Logger.verbose('CacheService is ready', LOG_CONTEXT);

      return this.getStatus(this.INDICATOR_KEY, true);
    }

    Logger.verbose('CacheServiceHealthIndicator is not ready', LOG_CONTEXT);

    throw new HealthCheckError(
      'Cache Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
