import { workflow } from '@novu/framework';
import { z } from 'zod';
import { renderUsageLimitsEmail } from './email';

const BLOCKED_REMINDER_WINDOW_DAYS = 4;
/** Covers a monthly billing period; the period-scoped throttle key resets alerts for the next period. */
const ONCE_PER_PERIOD_WINDOW_DAYS = 31;

export const usageLimitsPayloadSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  /** The threshold crossed (75, 90 or 100), as a percentage of `allowance`. */
  percentage: z.number().min(0),
  usage: z.number().min(0),
  allowance: z.number().min(0),
  planName: z.string(),
  /** ISO start of the billing period; scopes the throttle so alerts reset every period. */
  periodStart: z.string(),
  /** Whether the organization is blocked from sending once usage reaches the allowance. */
  blocksAtLimit: z.boolean(),
});

export type UsageLimitsPayload = z.infer<typeof usageLimitsPayloadSchema>;

export const usageLimitsWorkflow = workflow(
  'usage-limits',
  async ({ step, payload }) => {
    const isBlockedReminder = payload.blocksAtLimit && payload.percentage >= 100;

    await step.throttle('throttle', async () => {
      return {
        type: 'fixed',
        amount: isBlockedReminder ? BLOCKED_REMINDER_WINDOW_DAYS : ONCE_PER_PERIOD_WINDOW_DAYS,
        unit: 'days',
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
