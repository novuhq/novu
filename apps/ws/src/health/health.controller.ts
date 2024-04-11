import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { DalServiceHealthIndicator, IHealthIndicator } from '@novu/application-generic';

import { version } from '../../package.json';
import { WSServerHealthIndicator } from '../socket/services';

@Controller('v1/health-check')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private wsServerHealthIndicator: WSServerHealthIndicator,
    @Inject('QUEUE_HEALTH_INDICATORS') private indicators: IHealthIndicator[]
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    const indicatorHealthCheckFunctions = this.indicators.map((indicator) => async () => indicator.isHealthy());

    const result = await this.healthCheckService.check([
      ...indicatorHealthCheckFunctions,
      async () => this.dalHealthIndicator.isHealthy(),
      async () => this.wsServerHealthIndicator.isHealthy(),
      async () => ({
        apiVersion: {
          version,
          status: 'up',
        },
      }),
    ]);

    return result;
  }
}
