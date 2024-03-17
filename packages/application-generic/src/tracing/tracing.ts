import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function initializeOtelSdk(serviceName: string, version: string) {
  return new NodeSDK({
    resource: new Resource({
      'service.version': version,
      'service.group': 'instrumentation-group',
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
    metricReader: new PrometheusExporter({
      port: 9464,
      preventServerStart: false,
      appendTimestamp: true,
    }),
    spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter(), {
      // The maximum queue size. After the size is reached spans are dropped.
      maxQueueSize: 1000,
      // The interval between two consecutive exports
      scheduledDelayMillis: 30000,
    }),
    contextManager: new AsyncLocalStorageContextManager(),
    serviceName: serviceName,
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
