import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { DalServiceHealthIndicator } from '@novu/application-generic';

import { version } from '../../package.json';

@Controller('v1/health-check')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService, private dalHealthIndicator: DalServiceHealthIndicator) {}

  @Get()
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    const result = await this.healthCheckService.check([
      async () => ({
        apiVersion: {
          version,
          status: 'up',
        },
      }),
      () => this.dalHealthIndicator.isHealthy(),
    ]);

    return result;
  }
}
