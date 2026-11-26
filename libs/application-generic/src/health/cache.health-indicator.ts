import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { CacheService } from '../services/cache';
import { IHealthIndicator, toHealthIndicatorResult } from './health-indicator.interface';

@Injectable()
export class CacheServiceHealthIndicator implements IHealthIndicator {
  private static KEY = 'cacheService';

  constructor(private cacheService: CacheService) {}

  async isHealthy(): Promise<HealthIndicatorResult> {
    return toHealthIndicatorResult(
      CacheServiceHealthIndicator.KEY,
      this.cacheService.cacheEnabled(),
      'Cache health check failed'
    );
  }
}
