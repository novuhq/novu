import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
const nr = require('newrelic');
import { IMetricsService } from './metrics.interface';

const NAMESPACE = 'novu';
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
    this.recordMetric('Test/Service/Started', 1);
  }

  recordMetric(name: string, value: number): void {
    Logger.verbose(`Recording metric ${name} with value ${value}`, LOG_CONTEXT);
    const proms = this.services.map((service) => {
      return service.recordMetric(name, value).catch((e) => {
        Logger.verbose(
          `Failed to record metric ${name} with value ${value} for service ${service.constructor.name}`,
          e,
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
}

@Injectable()
export class AwsMetricsService implements IMetricsService {
  private client = new CloudWatchClient();

  async recordMetric(name: string, value: number): Promise<void> {
    const command = new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{ MetricName: name, Value: value }],
    });
    await this.client.send(command);
  }
}

@Injectable()
export class GCPMetricsService implements IMetricsService {
  async recordMetric(name: string, value: number): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

@Injectable()
export class AzureMetricsService implements IMetricsService {
  async recordMetric(key: string, value: number): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
