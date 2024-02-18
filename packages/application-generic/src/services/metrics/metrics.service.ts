import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
const nr = require('newrelic');
import { IMetricsService } from './metrics.interface';

const NAMESPACE = 'Novu';
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

@Injectable()
export class AwsMetricsService implements IMetricsService {
  private client = new CloudWatchClient();

  async recordMetric(name: string, value: number): Promise<void> {
    const command = new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{ MetricName: name, Value: value, StorageResolution: 1 }],
    });
    await this.client.send(command);
  }

  isActive(env: Record<string, string>): boolean {
    if (env.METRICS_SERVICE === 'AWS') {
      if (
        !!env.AWS_ACCESS_KEY_ID &&
        !!env.AWS_SECRET_ACCESS_KEY &&
        !!env.AWS_REGION
      ) {
        return true;
      } else {
        throw new Error('Missing AWS credentials');
      }
    }
  }
}

@Injectable()
export class GCPMetricsService implements IMetricsService {
  async recordMetric(name: string, value: number): Promise<void> {
    throw new Error('Method not implemented.');
  }

  isActive(env: Record<string, string>): boolean {
    return env.METRICS_SERVICE === 'GCP';
  }
}

@Injectable()
export class AzureMetricsService implements IMetricsService {
  async recordMetric(key: string, value: number): Promise<void> {
    throw new Error('Method not implemented.');
  }

  isActive(env: Record<string, string>): boolean {
    return env.METRICS_SERVICE === 'AZURE';
  }
}
