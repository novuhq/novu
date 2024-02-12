import { Module, Provider } from '@nestjs/common';
import { MetricsService, metricsServiceList } from '../services/metrics';
import {
  AwsMetricsService,
  AzureMetricsService,
  GCPMetricsService,
  NewRelicMetricsService,
} from '../services/metrics/metrics.service';

const PROVIDERS: Provider[] = [
  MetricsService,
  NewRelicMetricsService,
  GCPMetricsService,
  AzureMetricsService,
  AwsMetricsService,
  metricsServiceList,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class MetricsModule {}
