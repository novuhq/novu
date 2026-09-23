import { workflow } from '@novu/framework';
import { z } from 'zod';
import { renderUsageLimitsEmail } from './email';
import { usageLimitsAlertStateSchema } from './schemas';

// Ends before the caller's 4-day blocked reminder, since the engine window lasts `window + 30s` from the first reservation.
const BLOCKED_DEDUP_WINDOW_HOURS = 4 * 24 - 1;
const PERIOD_DEDUP_WINDOW_HOURS = 31 * 24;

export const usageLimitsPayloadSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  /** ISO start of the billing period, the same value the caller uses in its claim key. */
  periodStart: z.string(),
  /** The threshold crossed (75, 90 or 100), as a percentage of `allowance`. */
  percentage: z.number().min(0),
  usage: z.number().min(0),
  allowance: z.number().min(0),
  planName: z.string(),
  alertState: usageLimitsAlertStateSchema,
});

export type UsageLimitsPayload = z.infer<typeof usageLimitsPayloadSchema>;

/**
 * The caller's claim decides whether to trigger at all: once per organization, billing period and threshold,
 * with `blocked` re-sent every few days. The `dedup` step guarantees at most one delivery per organization,
 * billing period and threshold even if something else triggers the workflow. Neither replaces the other.
 */
export const usageLimitsWorkflow = workflow(
  'usage-limits',
  async ({ step, payload }) => {
    await step.throttle('dedup', async () => {
      return {
        type: 'fixed',
        amount: payload.alertState === 'blocked' ? BLOCKED_DEDUP_WINDOW_HOURS : PERIOD_DEDUP_WINDOW_HOURS,
        unit: 'hours',
        threshold: 1,
        throttleKey: `${payload.organizationId}:${payload.periodStart}:${payload.percentage}`,
      };
    });

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
        return {
          subject: controls.subject,
          body: controls.body,
        };
      },
      {
        controlSchema: z.object({
          subject: z.string().default('You are approaching your usage limits'),
          body: z.string().default('You have used {{payload.percentage}}% of your monthly events'),
        }),
      }
    );
  },
  {
    name: 'Usage Limits Alert',
    payloadSchema: usageLimitsPayloadSchema,
  }
);
