import { MetricsService, NewRelicMetricsService, OtelMetricsService } from './metrics.service';

export const metricsServiceList = {
  provide: 'MetricsServices',
  useFactory: (newRelicMetricsService: NewRelicMetricsService, otelMetricsService: OtelMetricsService) => {
    const allMetricsServices = [newRelicMetricsService, otelMetricsService];

    return allMetricsServices.filter((service) => service.isActive(process.env));
  },
  inject: [NewRelicMetricsService, OtelMetricsService],
};

export { MetricsService, OtelMetricsService };
