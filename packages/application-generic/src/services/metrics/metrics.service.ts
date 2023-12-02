import {
  CloudWatchClient,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as nr from 'newrelic';
import { IMetricsService } from './metrics.interface';

const NAMESPACE = 'novu';
const LOG_CONTEXT = 'MetricsService';

@Injectable()
export class MetricsService {
  constructor(@Inject('MetricsServices') private services: IMetricsService[]) {}

  recordMetric(name: string, value: number): void {
    Logger.verbose(`Recording metric ${name} with value ${value}`, LOG_CONTEXT);
    const proms = this.services.map((service) => {
      try {
        return service.recordMetric(name, value);
      } catch (e) {
        Logger.error(
          `Failed to record metric ${name} with value ${value} for service ${service.constructor.name}`,
          e,
          LOG_CONTEXT
        );

        return Promise.resolve();
      }
    });

    Promise.all(proms).catch((e) =>
      Logger.error('Error recording metrics', e, LOG_CONTEXT)
    );
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
