import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from '@opentelemetry/core';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const exporter = new CollectorTraceExporter();
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'basic-service',
  }),
});
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      // load custom configuration for http instrumentation
      '@opentelemetry/instrumentation-http': {
        applyCustomAttributesOnSpan: (span) => {
          span.setAttribute('foo2', 'bar2');
        },
      },
      '@opentelemetry/instrumentation-mongoose': {},
      '@opentelemetry/instrumentation-ioredis': {},
      '@opentelemetry/instrumentation-pino': {},
      '@opentelemetry/instrumentation-mongodb': {},
    }),
  ],
});

const prometheusExporter = new PrometheusExporter({
  port: 9464,
});

export function getOTELSDK(serviceName: string) {
  return new NodeSDK({
    defaultAttributes: undefined,
    metricReader: prometheusExporter,
    resource: undefined,
    resourceDetectors: [],
    sampler: undefined,
    serviceName: serviceName,
    spanLimits: undefined,
    traceExporter: new ConsoleSpanExporter(),
    views: [],
    autoDetectResources: false,
    spanProcessor: new BatchSpanProcessor(new JaegerExporter()),
    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new CompositePropagator({
      propagators: [
        new JaegerPropagator(),
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
        new B3Propagator(),
        new B3Propagator({
          injectEncoding: B3InjectEncoding.MULTI_HEADER,
        }),
      ],
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });
}
