import { OpenTelemetryModule } from 'nestjs-otel';

export * from './tracing';
export * from './otel-wrapper';
export { Counter } from '@opentelemetry/api';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const OtelModule = OpenTelemetryModule.forRoot({
  metrics: {
    hostMetrics: true,
    apiMetrics: {
      enable: true,
      ignoreRoutes: ['/favicon.ico', '/v1/health-check'],
      //Records metrics for all URLs, even undefined ones
      ignoreUndefinedRoutes: true,
    },
  },
});
