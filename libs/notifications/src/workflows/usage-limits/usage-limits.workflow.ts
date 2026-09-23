import { workflow } from '@novu/framework';
import { z } from 'zod';
import { renderUsageLimitsEmail } from './email';
import { usageLimitsAlertStateSchema } from './schemas';

/** Triggered at most once per organization, billing period and threshold; the caller owns deduplication. */
export const usageLimitsPayloadSchema = z.object({
  organizationName: z.string(),
  /** The threshold crossed (75, 90 or 100), as a percentage of `allowance`. */
  percentage: z.number().min(0),
  usage: z.number().min(0),
  allowance: z.number().min(0),
  planName: z.string(),
  alertState: usageLimitsAlertStateSchema,
});

export type UsageLimitsPayload = z.infer<typeof usageLimitsPayloadSchema>;

export const usageLimitsWorkflow = workflow(
  'usage-limits',
  async ({ step, payload }) => {
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
