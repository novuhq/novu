import { OpenTelemetryModule } from 'nestjs-otel';
export * from './tracing';

export {
  TraceService,
  MetricService,
  OtelInstanceCounter,
  OtelUpDownCounter,
  OtelHistogram,
  OtelObservableGauge,
  OtelObservableCounter,
  OtelObservableUpDownCounter,
  OtelCounter,
  Span,
} from 'nestjs-otel';
export { Counter } from '@opentelemetry/api';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const otelModule = OpenTelemetryModule.forRoot({
  metrics: {
    hostMetrics: true, // Includes Host Metrics
    apiMetrics: {
      enable: true, // Includes api metrics
      defaultAttributes: {
        // You can set default labels for api metrics
        custom: 'label',
      },
      // You can ignore specific routes (See https://docs.nestjs.com/middleware#excluding-routes for options)
      ignoreRoutes: ['/favicon.ico', '/v1/health-check'],
      //Records metrics for all URLs, even undefined ones
      ignoreUndefinedRoutes: true,
    },
  },
});
