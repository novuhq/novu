import {
  AzureMetricsService,
  GCPMetricsService,
  AwsMetricsService,
  MetricsService,
  NewRelicMetricsService,
} from './metrics.service';

export const metricsServiceList = {
  provide: 'MetricsServices',
  useFactory: (
    newRelicMetricsService: NewRelicMetricsService,
    gcsMetricsService: GCPMetricsService,
    azureMetricsService: AzureMetricsService,
    awsMetricsService: AwsMetricsService
  ) => {
    const allMetricsServices = [
      newRelicMetricsService,
      gcsMetricsService,
      azureMetricsService,
      awsMetricsService,
    ];

    const activeMetricsServices = allMetricsServices.filter((service) =>
      service.isActive(process.env)
    );

    return activeMetricsServices;
  },
  inject: [
    NewRelicMetricsService,
    GCPMetricsService,
    AzureMetricsService,
    AwsMetricsService,
  ],
};

export { MetricsService };
