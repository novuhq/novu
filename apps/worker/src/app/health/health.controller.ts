import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { DalServiceHealthIndicator } from '@novu/application-generic';

import { version } from '../../../package.json';

@Controller('health-check')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService, private dalHealthIndicator: DalServiceHealthIndicator) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.dalHealthIndicator.isHealthy(),
      async () => {
        return {
          apiVersion: {
            version,
            status: 'up',
          },
        };
      },
    ]);
  }
}
