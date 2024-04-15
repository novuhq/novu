import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { DalService } from '@novu/dal';
import { IHealthIndicator } from './health-indicator.interface';

@Injectable()
export class DalServiceHealthIndicator
  extends HealthIndicator
  implements IHealthIndicator
{
  private static KEY = 'db';

  constructor(private dalService: DalService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const isHealthy = this.dalService.connection.readyState === 1;
    const result = this.getStatus(DalServiceHealthIndicator.KEY, isHealthy);

    if (isHealthy) {
      return result;
    }

    throw new HealthCheckError('DAL health check failed', result);
  }

  isActive(): Promise<HealthIndicatorResult> {
    return this.isHealthy();
  }
}
