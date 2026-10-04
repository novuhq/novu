import { workflow } from '@novu/framework';
import { getUsageLimitsCopy, renderUsageLimitsEmail } from './email';
import { UsageLimitsAlertState, UsageLimitsPayload, usageLimitsPayloadSchema } from './schemas';

/** How often the caller re-sends a `blocked` alert while the organization stays blocked. */
export const USAGE_LIMITS_BLOCKED_REMINDER_HOURS = 4 * 24;

const PERIOD_DEDUP_WINDOW_HOURS = 31 * 24;

const DEDUP_WINDOW_HOURS: Record<UsageLimitsAlertState, number> = {
  approaching_limit: PERIOD_DEDUP_WINDOW_HOURS,
  alert_level_reached: PERIOD_DEDUP_WINDOW_HOURS,
  included_exhausted: PERIOD_DEDUP_WINDOW_HOURS,
  // Must end before the next reminder, and the engine keeps the window open a little past `amount`.
  blocked: USAGE_LIMITS_BLOCKED_REMINDER_HOURS - 1,
};

/** What makes two usage alerts the same alert, for the caller's claim key and the `dedup` step. */
export interface IUsageLimitsAlertIdentity {
  organizationId: string;
  periodStart: string;
  percentage: number;
  /**
   * The set limit a percentage threshold leads up to, and whether reaching it paused new runs; null for a plan's alert
   * levels and for `included_exhausted`, since changing the limit does not move the included runs.
   */
  limitThreshold: { allowance: number; isPaused: boolean } | null;
}

/**
 * A set limit is part of its thresholds' identity, so changing the limit re-arms them, and pausing is part of it at
 * the limit, so turning pause on after reaching it still sends the paused alert.
 */
export function usageLimitsAlertIdentity({
  organizationId,
  periodStart,
  percentage,
  allowance,
  alertState,
  usageLimits,
}: UsageLimitsPayload): IUsageLimitsAlertIdentity {
  const hasLimitThreshold = usageLimits.isLimitSet && alertState !== 'included_exhausted';

  return {
    organizationId,
    periodStart,
    percentage,
    limitThreshold: hasLimitThreshold ? { allowance, isPaused: alertState === 'blocked' } : null,
  };
}

export function usageLimitsDedupKey({
  organizationId,
  periodStart,
  percentage,
  limitThreshold,
}: IUsageLimitsAlertIdentity): string {
  const periodThresholdKey = `${organizationId}:${periodStart}:${percentage}`;

  if (limitThreshold === null) {
    return periodThresholdKey;
  }

  const limitThresholdKey = `${periodThresholdKey}:${limitThreshold.allowance}`;

  return limitThreshold.isPaused ? `${limitThresholdKey}:paused` : limitThresholdKey;
}

export function usageLimitsDedupThrottle(payload: UsageLimitsPayload) {
  return {
    type: 'fixed',
    amount: DEDUP_WINDOW_HOURS[payload.alertState],
    unit: 'hours',
    threshold: 1,
    throttleKey: usageLimitsDedupKey(usageLimitsAlertIdentity(payload)),
  } as const;
}

/**
 * The caller's claim decides whether to trigger at all: once per organization, billing period and threshold,
 * with `blocked` re-sent every few days. The `dedup` step guarantees at most one delivery per subscriber,
 * organization, billing period and threshold within its window, even if something else triggers the workflow.
 * Neither replaces the other.
 */
export const usageLimitsWorkflow = workflow(
  'usage-limits',
  async ({ step, payload }) => {
    await step.throttle('dedup', async () => usageLimitsDedupThrottle(payload));

    await step.email('email', async () => {
      const copy = getUsageLimitsCopy(payload);

      return { subject: copy.email.subject, body: await renderUsageLimitsEmail(copy) };
    });

    await step.inApp('in-app', async () => {
      const { inApp, button } = getUsageLimitsCopy(payload);

      return {
        subject: inApp.subject,
        body: inApp.body,
        primaryAction: {
          label: button.label,
          // Relative so the user stays on their region's dashboard host.
          redirect: { url: button.path, target: '_self' },
        },
      };
    });
  },
  {
    name: 'Usage Limits Alert',
    payloadSchema: usageLimitsPayloadSchema,
  }
);
