import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { DalService } from '@novu/dal';
import { version } from '../../package.json';

@Controller('v1/health-check')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private healthIndicator: HttpHealthIndicator,
    private dalService: DalService
  ) {}

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
