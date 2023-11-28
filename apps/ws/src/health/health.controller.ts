import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { IHealthIndicator } from '@novu/application-generic';

import { version } from '../../package.json';

@Controller('v1/health-check')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    @Inject('INDICATOR_LIST') private indicators: IHealthIndicator[]
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    const indicatorHealthCheckFunctions = this.indicators.map((indicator) => async () => indicator.isHealthy());

    const result = await this.healthCheckService.check([
      ...indicatorHealthCheckFunctions,
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
