import { Inject, Injectable, Logger } from '@nestjs/common';
import * as otelApi from '@opentelemetry/api';
import { IMetricsService } from './metrics.interface';

const nr = require('newrelic');

const LOG_CONTEXT = 'MetricsService';

@Injectable()
export class MetricsService {
  constructor(@Inject('MetricsServices') private services: IMetricsService[]) {
    Logger.log(
      `MetricsService running with: [${this.services
        .map((metricService) => metricService.constructor.name)
        .join(', ')}]`,
      LOG_CONTEXT
    );
  }

  recordMetric(name: string, value: number): void {
    Logger.verbose(`Recording metric ${name} with value ${value}`, LOG_CONTEXT);
    const proms = this.services.map((service) => {
      return service.recordMetric(name, value).catch((e) => {
        Logger.error(
          `Failed to record metric ${name} with value ${value} for service ${service.constructor.name}.\nError: ${e}`,
          LOG_CONTEXT
        );
      });
    });

    Promise.all(proms);
  }
}

@Injectable()
export class NewRelicMetricsService implements IMetricsService {
  async recordMetric(name: string, value: number): Promise<void> {
    nr.recordMetric(name, value);
  }

  isActive(env: Record<string, string>): boolean {
    return !!env.NEW_RELIC_LICENSE_KEY;
  }
}

/**
 * Routes BullMQ queue-depth metrics into the OpenTelemetry Metrics SDK.
 *
 * Two metric name patterns are handled with structured attributes:
 *
 *   "Queue/<deployment>/<topic>/<state>"  → novu.queue.jobs  { deployment, queue, state }
 *   "Cron/<deployment>/<job>/<event>"     → novu.cron.jobs   { deployment, job, event }
 *
 * Any OTLP-compatible backend (Prometheus, Datadog, SigNoz, Grafana Cloud …)
 * can filter/group by any attribute without parsing metric name strings.
 *
 * Generic metric names that don't match either pattern are sanitised and
 * recorded on individual gauges so nothing is silently dropped.
 */
@Injectable()
export class OtelMetricsService implements IMetricsService {
  private readonly meter = otelApi.metrics.getMeter('novu', process.env.npm_package_version);
  private readonly queueGauge = this.meter.createGauge('novu.queue.jobs', {
    description: 'Current number of jobs in each BullMQ queue by state',
    unit: '{jobs}',
  });
  private readonly cronGauge = this.meter.createGauge('novu.cron.jobs', {
    description: 'Count of cron job executions and current queue depth by event type',
    unit: '{jobs}',
  });
  private readonly genericGauges = new Map<string, otelApi.Gauge>();

  async recordMetric(name: string, value: number): Promise<void> {
    const parts = name.split('/');

    if (parts[0] === 'Queue' && parts.length === 4) {
      this.queueGauge.record(value, {
        'deployment': parts[1],
        'queue': parts[2],
        'state': parts[3],
      });

      return;
    }

    if (parts[0] === 'Cron' && parts.length === 4) {
      this.cronGauge.record(value, {
        'deployment': parts[1],
        'job': parts[2],
        'event': parts[3],
      });

      return;
    }

    const sanitized = name.toLowerCase().replace(/[^a-z0-9_.]/g, '_');

    if (!this.genericGauges.has(sanitized)) {
      this.genericGauges.set(sanitized, this.meter.createGauge(sanitized));
    }

    const gauge = this.genericGauges.get(sanitized);

    gauge?.record(value);
  }

  isActive(env: Record<string, string>): boolean {
    return env.ENABLE_OTEL === 'true';
  }
}
