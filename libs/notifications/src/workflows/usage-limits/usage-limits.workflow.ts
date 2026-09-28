import { workflow } from '@novu/framework';
import { z } from 'zod';
import { getUsageLimitsCopy, renderUsageLimitsEmail } from './email';
import { UsageLimitsAlertState, usageLimitsAlertStateSchema, usageLimitsCtaSchema } from './schemas';

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

export const usageLimitsPayloadSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  /** ISO start of the billing period. */
  periodStart: z.string(),
  /**
   * The threshold crossed: 0 when usage reached `includedEvents`, otherwise 75, 90 or 100 percent of the way
   * from `includedEvents` (0 when absent) to `allowance`.
   */
  percentage: z.number().min(0),
  usage: z.number().min(0),
  /** The cap the percentage thresholds lead up to. */
  allowance: z.number().min(0),
  planName: z.string(),
  alertState: usageLimitsAlertStateSchema,
  /** Included events of a plan that bills on-demand usage past them. */
  includedEvents: z.number().min(0).nullable().optional(),
  /** On-demand events the organization allows on top of `includedEvents`; null or absent without a set limit. */
  headroom: z.number().min(0).nullable().optional(),
  /** Absent means `upgrade`. */
  cta: usageLimitsCtaSchema.optional(),
});

export type UsageLimitsPayload = z.infer<typeof usageLimitsPayloadSchema>;

/**
 * The alert identity shared by the caller's claim key and the `dedup` step, so both dedupe the same alert.
 * A set limit's cap is part of the identity of the percentage thresholds, so changing the limit re-arms them;
 * the included-events alert (percentage 0) stays once per period.
 */
export function usageLimitsDedupKey({
  organizationId,
  periodStart,
  percentage,
  allowance,
  headroom,
}: Pick<UsageLimitsPayload, 'organizationId' | 'periodStart' | 'percentage' | 'allowance' | 'headroom'>): string {
  const periodThresholdKey = `${organizationId}:${periodStart}:${percentage}`;

  if (percentage > 0 && typeof headroom === 'number') {
    return `${periodThresholdKey}:${allowance}`;
  }

  return periodThresholdKey;
}

export function usageLimitsDedupThrottle(payload: UsageLimitsPayload) {
  return {
    type: 'fixed',
    amount: DEDUP_WINDOW_HOURS[payload.alertState],
    unit: 'hours',
    threshold: 1,
    throttleKey: usageLimitsDedupKey(payload),
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

    await step.email(
      'email',
      async (controls) => {
        return {
          subject: controls.subject,
          body: await renderUsageLimitsEmail(payload, controls),
        };
      },
      {
        controlSchema: z.object({
          subject: z.string().default('You are approaching your usage limits'),
          previewText: z.string().default('You have used {{payload.percentage}}% of your monthly events'),
        }),
      }
    );

    await step.inApp(
      'in-app',
      async (controls) => {
        const isBlocked = payload.alertState === 'blocked';

        return {
          subject: isBlocked ? controls.blockedSubject : controls.subject,
          body: isBlocked ? controls.blockedBody : controls.body,
          primaryAction: {
            label: getUsageLimitsCopy(payload.alertState ?? 'approaching_limit').buttonLabel,
            // Relative so the user stays on their region's dashboard host.
            redirect: { url: '/settings/billing', target: '_self' },
          },
        };
      },
      {
        controlSchema: z.object({
          subject: z.string().default('You are approaching your usage limits'),
          blockedSubject: z.string().default('Usage limit reached: new notifications are blocked'),
          body: z.string().default('You have used {{payload.percentage}}% of your monthly events'),
          blockedBody: z
            .string()
            .default(
              'You have used 100% of your monthly events. Upgrade to send again, or wait for your next billing cycle.'
            ),
        }),
      }
    );
  },
  {
    name: 'Usage Limits Alert',
    payloadSchema: usageLimitsPayloadSchema,
  }
);
