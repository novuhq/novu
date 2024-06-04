import { Span } from 'nestjs-otel';
import { TraceService as setTraceService } from 'nestjs-otel';
import { MetricService as setMetricService } from 'nestjs-otel';
import { OtelInstanceCounter as setOtelInstanceCounter } from 'nestjs-otel';
import { OtelUpDownCounter as setOtelUpDownCounter } from 'nestjs-otel';
import { OtelHistogram as setOtelHistogram } from 'nestjs-otel';
import { OtelObservableGauge as setOtelObservableGauge } from 'nestjs-otel';
import { OtelObservableCounter as setOtelObservableCounter } from 'nestjs-otel';
import { OtelObservableUpDownCounter as setOtelObservableUpDownCounter } from 'nestjs-otel';
import { OtelCounter as setOtelCounter } from 'nestjs-otel';
import { MetricOptions, SpanOptions } from '@opentelemetry/api';
import { Injectable } from '@nestjs/common';
import { PipeTransform, Type } from '@nestjs/common';

export type OtelDataOrPipe =
  | string
  | PipeTransform<any, any>
  | Type<PipeTransform<any, any>>;

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelSpan(name?: string, options?: SpanOptions) {
  return Span(name, options);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelInstanceCounter(options?: MetricOptions) {
  return setOtelInstanceCounter(options);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelUpDownCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelUpDownCounter(...dataOrPipes);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelHistogram(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelHistogram(...dataOrPipes);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelObservableGauge(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelObservableGauge(...dataOrPipes);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelObservableCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelObservableCounter(...dataOrPipes);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelObservableUpDownCounter(...dataOrPipes: OtelDataOrPipe[]) {
  return setOtelObservableUpDownCounter(...dataOrPipes);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
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
