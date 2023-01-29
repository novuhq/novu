import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { version } from '../../package.json';

@Controller('v1/health-check')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService) {}

  @Get()
  @HealthCheck()
  async healthCheck() {
    const result = await this.healthCheckService.check([
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
