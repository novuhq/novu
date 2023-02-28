import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { DalService } from '@novu/dal';
import { version } from '../../../package.json';
import { logDecorator } from '@novu/application-generic';

@Controller('health-check')
@ApiExcludeController()
@logDecorator()
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private healthIndicator: HttpHealthIndicator,
    private dalService: DalService
  ) {}

  @Get()
  @HealthCheck()
  healthCheck() {
    return this.healthCheckService.check([
      async () => {
        return {
          db: {
            status: this.dalService.connection.readyState === 1 ? 'up' : 'down',
          },
        };
      },
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
