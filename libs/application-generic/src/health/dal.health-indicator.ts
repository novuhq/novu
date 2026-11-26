import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { DalService } from '@novu/dal';
import { IHealthIndicator, toHealthIndicatorResult } from './health-indicator.interface';

@Injectable()
export class DalServiceHealthIndicator implements IHealthIndicator {
  private static KEY = 'db';

  constructor(private dalService: DalService) {}

  async isHealthy(): Promise<HealthIndicatorResult> {
    return toHealthIndicatorResult(
      DalServiceHealthIndicator.KEY,
      this.dalService.connection.readyState === 1,
      'DAL health check failed'
    );
  }
}
