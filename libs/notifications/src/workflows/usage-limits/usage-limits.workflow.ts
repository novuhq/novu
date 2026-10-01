import { workflow } from '@novu/framework';
import { z } from 'zod';
import {
  getUsageLimitsCopy,
  getUsageLimitsNotificationText,
  renderUsageLimitsEmail,
  USAGE_LIMITS_CONTROL_DEFAULTS,
} from './email';
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

/**
 * The alert identity shared by the caller's claim key and the `dedup` step, so both dedupe the same alert.
 * Without a set limit it is the plan alert's identity, unchanged by enabling usage limits. With one, the cap is part
 * of each percentage threshold's identity, so changing the limit re-arms them, and pausing is part of the identity at
 * the limit, so turning pause on after reaching it still sends the paused alert. `included_exhausted` stays once per
 * period.
 */
export function usageLimitsDedupKey({
  organizationId,
  periodStart,
  percentage,
  allowance,
  alertState,
  usageLimits,
}: Pick<
  UsageLimitsPayload,
  'organizationId' | 'periodStart' | 'percentage' | 'allowance' | 'alertState' | 'usageLimits'
>): string {
  const periodThresholdKey = `${organizationId}:${periodStart}:${percentage}`;

  if (!usageLimits?.isLimitSet || alertState === 'included_exhausted') {
    return periodThresholdKey;
  }

  const limitThresholdKey = `${periodThresholdKey}:${allowance}`;

  return alertState === 'blocked' ? `${limitThresholdKey}:paused` : limitThresholdKey;
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
    const copy = getUsageLimitsCopy(payload);

    await step.throttle('dedup', async () => usageLimitsDedupThrottle(payload));

    await step.email(
      'email',
      async (controls) => {
        const { subject, body: previewText } = getUsageLimitsNotificationText(copy, {
          subject: controls.subject,
          body: controls.previewText,
        });

        return {
          subject,
          body: await renderUsageLimitsEmail(copy, previewText),
        };
      },
      {
        controlSchema: z.object({
          subject: z.string().default(USAGE_LIMITS_CONTROL_DEFAULTS.subject),
          previewText: z.string().default(USAGE_LIMITS_CONTROL_DEFAULTS.body),
        }),
      }
    );

    await step.inApp(
      'in-app',
      async (controls) => {
        const { subject, body } = getUsageLimitsNotificationText(copy, {
          subject: controls.subject,
          body: controls.body,
          blockedSubject: controls.blockedSubject,
          blockedBody: controls.blockedBody,
        });

        return {
          subject,
          body,
          primaryAction: {
            label: copy.buttonLabel,
            // Relative so the user stays on their region's dashboard host.
            redirect: { url: copy.dashboardPath, target: '_self' },
          },
        };
      },
      {
        controlSchema: z.object({
          subject: z.string().default(USAGE_LIMITS_CONTROL_DEFAULTS.subject),
          blockedSubject: z.string().default(USAGE_LIMITS_CONTROL_DEFAULTS.blockedSubject),
          body: z.string().default(USAGE_LIMITS_CONTROL_DEFAULTS.body),
          blockedBody: z.string().default(USAGE_LIMITS_CONTROL_DEFAULTS.blockedBody),
        }),
      }
    );
  },
  {
    name: 'Usage Limits Alert',
    payloadSchema: usageLimitsPayloadSchema,
  }
);
