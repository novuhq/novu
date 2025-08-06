import { Inject, Injectable, Logger } from '@nestjs/common';
import { IMetricsService } from './metrics.interface';

const nr = require('newrelic');

const LOG_CONTEXT = 'MetricsService';

@Injectable()
export class MetricsService {
  constructor(@Inject('MetricsServices') private services: IMetricsService[]) {
    Logger.log(
      `MetricsService running with: [${this.services
        .map((metricService) => metricService.constructor.name)
        .join(', ')}]`,
      LOG_CONTEXT
    );
  }

  recordMetric(name: string, value: number): void {
    Logger.verbose(`Recording metric ${name} with value ${value}`, LOG_CONTEXT);
    const proms = this.services.map((service) => {
      return service.recordMetric(name, value).catch((e) => {
        Logger.error(
          `Failed to record metric ${name} with value ${value} for service ${service.constructor.name}.\nError: ${e}`,
          LOG_CONTEXT
        );
      });
    });

    Promise.all(proms);
  }
}

@Injectable()
export class NewRelicMetricsService implements IMetricsService {
  async recordMetric(name: string, value: number): Promise<void> {
    nr.recordMetric(name, value);
  }

  isActive(env: Record<string, string>): boolean {
    return !!env.NEW_RELIC_LICENSE_KEY;
  }
}
