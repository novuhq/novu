import { INestApplication, Logger } from '@nestjs/common';
import { ProviderHttpCallEvent, setProviderHttpObserver } from '@novu/providers';
import { MetricsService } from '../metrics';

const LOG_CONTEXT = 'ProviderHttpObservability';

/**
 * Slow enough that it is worth a log line on its own, well short of the timeout so the
 * signal arrives before a call is cut off rather than after.
 */
const SLOW_CALL_THRESHOLD_MS = 30_000;

const metricName = (event: ProviderHttpCallEvent, suffix: string) =>
  `ProviderHttp/${event.channel ?? 'unknown'}/${event.providerId ?? 'unknown'}/${suffix}`;

/**
 * Routes provider HTTP call timings from `@novu/providers` into the app's logger and
 * metrics backend.
 *
 * `@novu/providers` is a published package with no Nest dependency, so it exposes a
 * plain observer hook instead of emitting metrics itself. Call this once during
 * bootstrap, after the Nest context exists.
 *
 * The timeout counter is the alerting signal for a provider that has stopped
 * responding; the duration metric is the latency dataset that tells us whether the
 * default timeout is set sensibly.
 */
export const registerProviderHttpObserver = (app: INestApplication): void => {
  // Not every app imports MetricsModule — the API does not — so metrics are best-effort
  // while the logs are unconditional.
  let metricsService: MetricsService | undefined;
  try {
    metricsService = app.get(MetricsService, { strict: false });
  } catch {
    Logger.warn('MetricsService is unavailable, provider HTTP calls will only be logged', LOG_CONTEXT);
  }

  setProviderHttpObserver((event) => {
    metricsService?.recordMetric(metricName(event, 'duration'), event.durationMs);

    if (event.timedOut) {
      metricsService?.recordMetric(metricName(event, 'timeout'), 1);

      Logger.error(
        {
          providerId: event.providerId,
          channel: event.channel,
          durationMs: event.durationMs,
        },
        'Provider HTTP call was aborted by the request timeout',
        LOG_CONTEXT
      );

      return;
    }

    if (event.durationMs >= SLOW_CALL_THRESHOLD_MS) {
      Logger.warn(
        {
          providerId: event.providerId,
          channel: event.channel,
          durationMs: event.durationMs,
        },
        'Provider HTTP call was slow',
        LOG_CONTEXT
      );
    }
  });
};
