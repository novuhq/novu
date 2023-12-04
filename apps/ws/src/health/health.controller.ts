import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { DalServiceHealthIndicator, WebSocketsQueueServiceHealthIndicator } from '@novu/application-generic';

import { version } from '../../package.json';
import { WSHealthIndicator } from '../socket/services';

@Controller('v1/health-check')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private dalHealthIndicator: DalServiceHealthIndicator,
    private webSocketsQueueHealthIndicator: WebSocketsQueueServiceHealthIndicator,
    private wsHealthIndicator: WSHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck(): Promise<HealthCheckResult> {
    const result = await this.healthCheckService.check([
      async () => this.dalHealthIndicator.isHealthy(),
      async () => this.webSocketsQueueHealthIndicator.isHealthy(),
      async () => this.wsHealthIndicator.isHealthy(),
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
