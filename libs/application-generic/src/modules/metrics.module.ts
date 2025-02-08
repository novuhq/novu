import { Module, Provider } from '@nestjs/common';
import { MetricsService, metricsServiceList } from '../services/metrics';
import { NewRelicMetricsService } from '../services/metrics/metrics.service';

const PROVIDERS: Provider[] = [
  MetricsService,
  NewRelicMetricsService,
  metricsServiceList,
];

@Module({
  providers: [...PROVIDERS],
  exports: [...PROVIDERS],
})
export class MetricsModule {}
