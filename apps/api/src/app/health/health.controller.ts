import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorFunction,
  HealthCheckError,
} from '@nestjs/terminus';
import {
  CacheServiceHealthIndicator,
  DalServiceHealthIndicator,
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
    private workflowQueueHealthIndicator: WorkflowQueueServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthIndicatorFunction[] = [
      async () => this.dalHealthIndicator.isHealthy(),
      async () => this.workflowQueueHealthIndicator.isHealthy(),
      async () => ({
        apiVersion: {
          version,
          status: 'up',
        },
      }),
    ];

    if (process.env.ELASTICACHE_CLUSTER_SERVICE_HOST) {
      checks.push(async () => this.cacheHealthIndicator.isHealthy());
    }

    return this.healthCheckService.check(checks);
  }
}
