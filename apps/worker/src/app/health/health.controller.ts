import { Controller, Get, Inject } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { DalServiceHealthIndicator, QueueHealthIndicator } from '@novu/application-generic';

import { version } from '../../../package.json';

@Controller('health-check')
@ApiExcludeController()
export class HealthController {
  constructor(
    @Inject('QUEUE_HEALTH_INDICATORS')
    private healthIndicators: QueueHealthIndicator[],
    private healthCheckService: HealthCheckService,
    private dalHealthIndicator: DalServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  healthCheck(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      async () => this.dalHealthIndicator.isHealthy(),
      ...this.healthIndicators.map((indicator) => async () => indicator.isHealthy()),
      async () => ({
        apiVersion: {
          version,
          status: 'up',
        },
      }),
    ]);
  }
}
