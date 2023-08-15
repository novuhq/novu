import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService, HealthIndicatorFunction } from '@nestjs/terminus';
import {
  CacheServiceHealthIndicator,
  DalServiceHealthIndicator,
  InMemoryProviderServiceHealthIndicator,
  WorkflowQueueServiceHealthIndicator,
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
    private workflowQueueHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthIndicatorFunction[] = [
      () => this.dalHealthIndicator.isHealthy(),
      () => this.inMemoryHealthIndicator.isHealthy(),
      () => this.workflowQueueHealthIndicator.isHealthy(),
      async () => {
        return {
          apiVersion: {
            version,
            status: 'up',
          },
        };
      },
    ];

    if (process.env.ELASTICACHE_CLUSTER_SERVICE_HOST) {
      checks.push(() => this.cacheHealthIndicator.isHealthy());
    }

    return this.healthCheckService.check(checks);
  }
}
