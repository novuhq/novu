import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { DalServiceHealthIndicator, WsQueueServiceHealthIndicator } from '@novu/application-generic';

import { version } from '../../package.json';

@Controller('v1/health-check')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private wsQueueHealthIndicator: WsQueueServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    const result = await this.healthCheckService.check([
      () => this.dalHealthIndicator.isHealthy(),
      () => this.wsQueueHealthIndicator.isHealthy(),
      async () => {
        return {
          apiVersion: {
            version,
            status: 'up',
          },
        };
      },
    ]);

    return result;
  }
}
