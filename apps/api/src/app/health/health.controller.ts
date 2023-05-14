import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { HealthIndicatorFunction } from '@nestjs/terminus/dist/health-indicator';
import {
  CacheServiceHealthIndicator,
  DalServiceHealthIndicator,
  InMemoryProviderServiceHealthIndicator,
  TriggerQueueServiceHealthIndicator,
} from '@novu/application-generic';

import { version } from '../../../package.json';

@Controller('health-check')
@ApiExcludeController()
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private cacheHealthIndicator: CacheServiceHealthIndicator,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private inMemoryHealthIndicator: InMemoryProviderServiceHealthIndicator,
    private triggerQueueHealthIndicator: TriggerQueueServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthIndicatorFunction[] = [
      () => this.dalHealthIndicator.isHealthy(),
      () => this.inMemoryHealthIndicator.isHealthy(),
      async () => {
        return {
          apiVersion: {
            version,
            status: 'up',
          },
        };
      },
      () => this.triggerQueueHealthIndicator.isHealthy(),
    ];

    if (process.env.ELASTICACHE_CLUSTER_SERVICE_HOST) {
      checks.push(() => this.cacheHealthIndicator.isHealthy());
    }

    return this.healthCheckService.check(checks);
  }
}
