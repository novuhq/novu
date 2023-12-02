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

    switch (process.env.METRICS_SERVICE) {
      case 'GCP':
        metricsServices.push(gcsMetricsService);
        break;
      case 'AZURE':
        metricsServices.push(azureMetricsService);
        break;
      case 'AWS':
        if (
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY
        ) {
          metricsServices.push(awsMetricsService);
        } else {
          throw new Error(
            'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set when using AWS as metrics service'
          );
        }
      case undefined:
        if (
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY
        ) {
          metricsServices.push(awsMetricsService);
        }
        break;
      default:
        throw new Error(
          `Invalid value for METRICS_SERVICE: ${process.env.METRICS_SERVICE}`
        );
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
