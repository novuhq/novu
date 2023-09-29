import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { DalServiceHealthIndicator, WebSocketsQueueServiceHealthIndicator } from '@novu/application-generic';

import { version } from '../../package.json';

@Controller('v1/health-check')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private webSocketsQueueHealthIndicator: WebSocketsQueueServiceHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    const result = await this.healthCheckService.check([
      async () => this.dalHealthIndicator.isHealthy(),
      async () => this.webSocketsQueueHealthIndicator.isHealthy(),
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
