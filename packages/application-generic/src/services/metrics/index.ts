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
    const metricsServices = [];

    if (process.env.NEW_RELIC_LICENSE_KEY) {
      metricsServices.push(newRelicMetricsService);
    }

    switch (String(process.env.METRICS_SERVICE)) {
      case 'GCS':
        metricsServices.push(gcsMetricsService);
        break;
      case 'AZURE':
        metricsServices.push(azureMetricsService);
        break;
      case 'AWS':
      default:
        if (
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY
        ) {
          metricsServices.push(awsMetricsService);
        }
        break;
    }

    return metricsServices;
  },
  inject: [
    NewRelicMetricsService,
    GCPMetricsService,
    AzureMetricsService,
    AwsMetricsService,
  ],
};

export { MetricsService };
