import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Inject, Injectable } from '@nestjs/common';

import { CacheService } from '../services';

@Injectable()
export class CacheServiceHealthIndicator extends HealthIndicator {
  private INDICATOR_KEY = 'cacheService';

  constructor(@Inject(CacheService) private cacheService: CacheService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    if (this.cacheService.cacheEnabled()) {
      return this.getStatus(this.INDICATOR_KEY, true);
    }

    throw new HealthCheckError(
      'Cache Health',
      this.getStatus(this.INDICATOR_KEY, false)
    );
  }
}
