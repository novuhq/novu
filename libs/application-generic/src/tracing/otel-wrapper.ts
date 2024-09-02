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
import { MetricOptions, SpanOptions } from '@opentelemetry/api';
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

export function OtelUpDownCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelUpDownCounter(...dataOrPipes);
}

export function OtelHistogram(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelHistogram(...dataOrPipes);
}

export function OtelObservableGauge(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelObservableGauge(...dataOrPipes);
}

export function OtelObservableCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelObservableCounter(...dataOrPipes);
}

export function OtelObservableUpDownCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelObservableUpDownCounter(...dataOrPipes);
}

export function OtelCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelCounter(...dataOrPipes);
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
