import {
  Span,
  TraceService as setTraceService,
  MetricService as setMetricService,
  OtelInstanceCounter as setOtelInstanceCounter,
  OtelUpDownCounter as setOtelUpDownCounter,
  OtelHistogram as setOtelHistogram,
  OtelObservableGauge as setOtelObservableGauge,
  OtelObservableCounter as setOtelObservableCounter,
  OtelObservableUpDownCounter as setOtelObservableUpDownCounter,
  OtelCounter as setOtelCounter,
} from 'nestjs-otel';
import { MetricOptions, SpanOptions, Tracer } from '@opentelemetry/api';
import { Injectable, PipeTransform, Type } from '@nestjs/common';

export type OtelDataOrPipe =
  | string
  | PipeTransform<any, any>
  | Type<PipeTransform<any, any>>;

export function OtelSpan(name?: string, options?: SpanOptions) {
  return Span(name, options);
}

export function OtelInstanceCounter(options?: MetricOptions) {
  return setOtelInstanceCounter(options);
}

export function OtelUpDownCounter(name: string, options?: MetricOptions) {
  return setOtelUpDownCounter(name, options);
}

export function OtelHistogram(name: string, options?: MetricOptions) {
  return setOtelHistogram(name, options);
}

export function OtelObservableGauge(name: string, options?: MetricOptions) {
  return setOtelObservableGauge(name, options);
}

export function OtelObservableCounter(name: string, options?: MetricOptions) {
  return setOtelObservableCounter(name, options);
}

export function OtelObservableUpDownCounter(
  name: string,
  options?: MetricOptions,
) {
  return setOtelObservableUpDownCounter(name, options);
}

export function OtelCounter(name: string, options?: MetricOptions) {
  return setOtelCounter(name, options);
}

@Injectable()
export class TraceService extends setTraceService {
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
export class MetricService extends setMetricService {
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
