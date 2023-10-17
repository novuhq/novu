import { HealthIndicatorResult } from '@nestjs/terminus';

export interface IHealthIndicator {
  isHealthy(): Promise<HealthIndicatorResult>;
  isActive(): Promise<HealthIndicatorResult>;
}
