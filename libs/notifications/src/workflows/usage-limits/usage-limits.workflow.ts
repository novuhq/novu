import { workflow } from '@novu/framework';
import { z } from 'zod';
import { renderUsageLimitsEmail } from './email';

export const usageLimitsWorkflow = workflow(
  'usage-limits',
  async ({ step, payload }) => {
    await step.digest('digest', async () => {
      return {
        amount: 5,
        unit: 'minutes',
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
    payloadSchema: z.object({
      percentage: z.number().min(0),
      organizationName: z.string(),
    }),
  }
);
