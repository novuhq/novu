import { Span as OtelSpan } from 'nestjs-otel';
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

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Span(name?: string, options?: SpanOptions) {
  return OtelSpan(name, options);
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelInstanceCounter(options?: MetricOptions) {
  return setOtelInstanceCounter(options);
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelUpDownCounter(
  ...dataOrPipes: (
    | string
    | import('@nestjs/common').PipeTransform<any, any>
    | import('@nestjs/common').Type<
        import('@nestjs/common').PipeTransform<any, any>
      >
  )[]
) {
  return setOtelUpDownCounter(...dataOrPipes);
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelHistogram(
  ...dataOrPipes: (
    | string
    | import('@nestjs/common').PipeTransform<any, any>
    | import('@nestjs/common').Type<
        import('@nestjs/common').PipeTransform<any, any>
      >
  )[]
) {
  return setOtelHistogram();
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelObservableGauge(
  ...dataOrPipes: (
    | string
    | import('@nestjs/common').PipeTransform<any, any>
    | import('@nestjs/common').Type<
        import('@nestjs/common').PipeTransform<any, any>
      >
  )[]
) {
  return setOtelObservableGauge();
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelObservableCounter(
  ...dataOrPipes: (
    | string
    | import('@nestjs/common').PipeTransform<any, any>
    | import('@nestjs/common').Type<
        import('@nestjs/common').PipeTransform<any, any>
      >
  )[]
) {
  return setOtelObservableCounter();
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelObservableUpDownCounter(
  ...dataOrPipes: (
    | string
    | import('@nestjs/common').PipeTransform<any, any>
    | import('@nestjs/common').Type<
        import('@nestjs/common').PipeTransform<any, any>
      >
  )[]
) {
  return setOtelObservableUpDownCounter();
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export function OtelCounter(
  ...dataOrPipes: (
    | string
    | import('@nestjs/common').PipeTransform<any, any>
    | import('@nestjs/common').Type<
        import('@nestjs/common').PipeTransform<any, any>
      >
  )[]
) {
  return setOtelCounter();
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
