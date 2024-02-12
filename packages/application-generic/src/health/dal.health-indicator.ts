import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { DalService } from '@novu/dal';
import { IHealthIndicator } from './health-indicator.interface';

@Injectable()
export class DalServiceHealthIndicator
  extends HealthIndicator
  implements IHealthIndicator
{
  private INDICATOR_KEY = 'db';

  constructor(private dalService: DalService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    const status = this.dalService.connection.readyState === 1;

    return this.getStatus(this.INDICATOR_KEY, status);
  }

  isActive(): Promise<HealthIndicatorResult> {
    return this.isHealthy();
  }
}
