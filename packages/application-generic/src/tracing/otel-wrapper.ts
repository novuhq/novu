import { Span as OtelSpan } from 'nestjs-otel';
import { TraceService as OtelTraceService } from 'nestjs-otel';
import { MetricService as OtelMetricService } from 'nestjs-otel';
import { SpanOptions } from '@opentelemetry/api';
import { Injectable } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Span(name?: string, options?: SpanOptions) {
  return OtelSpan(name, options);
}

@Injectable()
export class TraceService extends OtelTraceService {
  getTracer() {
    return super.getTracer();
  }

  getSpan() {
    return super.getSpan();
  }

  startSpan(name: string) {
    return super.startSpan(name);
  }
}

@Injectable()
export class MetricService extends OtelMetricService {
  getCounter(name, options) {
    return super.getCounter(name, options);
  }

  getUpDownCounter(name, options) {
    return super.getUpDownCounter(name, options);
  }

  getHistogram(name, options) {
    return super.getHistogram(name, options);
  }

  getObservableCounter(name, options) {
    return super.getObservableCounter(name, options);
  }

  getObservableGauge(name, options) {
    return super.getObservableGauge(name, options);
  }

  getObservableUpDownCounter(name, options) {
    return super.getObservableUpDownCounter(name, options);
  }
}
