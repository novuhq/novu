import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthIndicatorFunction } from '@nestjs/terminus/dist/health-indicator';
import { DalService } from '@novu/dal';

import { version } from '../../../package.json';
import { CacheServiceHealthIndicator } from './cache-health-indicator';

@Controller('health-check')
@ApiExcludeController()
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dalService: DalService,
    private cacheHealthIndicator: CacheServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck() {
    const checks: HealthIndicatorFunction[] = [
      async () => {
        return {
          db: {
            status: this.dalService.connection.readyState === 1 ? 'up' : 'down',
          },
        };
      },
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
