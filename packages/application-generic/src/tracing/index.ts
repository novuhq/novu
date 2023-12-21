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

export const otelModule = OpenTelemetryModule.forRoot({
  metrics: {
    hostMetrics: true,
    apiMetrics: {
      enable: true,
      defaultAttributes: {
        custom: 'label',
      },
      ignoreRoutes: ['/favicon.ico', '/v1/health-check'],
      //Records metrics for all URLs, even undefined ones
      ignoreUndefinedRoutes: true,
    },
  },
});
