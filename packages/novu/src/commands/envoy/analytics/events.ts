import { AnalyticService } from '../../../services/analytics.service';

export const ENVOY_EVENTS = {
  STARTED: 'Envoy Started',
  AUTH_COMPLETED: 'Envoy Auth Completed',
  STEP: 'Envoy Step',
  COMPLETED: 'Envoy Completed',
  CANCELLED: 'Envoy Cancelled',
  ERROR: 'Envoy Error',
} as const;

export type EnvoyEvent = (typeof ENVOY_EVENTS)[keyof typeof ENVOY_EVENTS];

export function trackEnvoy(
  analytics: AnalyticService,
  anonymousId: string | undefined,
  event: EnvoyEvent,
  data: Record<string, unknown> = {}
): void {
  if (!anonymousId) return;

  analytics.track({
    identity: { anonymousId },
    event,
    data,
  });
}
