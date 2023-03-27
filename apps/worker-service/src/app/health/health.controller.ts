import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { DalService } from '@novu/dal';

import { version } from '../../../package.json';

@Controller('health-check')
export class HealthController {
  constructor(private healthCheckService: HealthCheckService, private dalService: DalService) {}

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
