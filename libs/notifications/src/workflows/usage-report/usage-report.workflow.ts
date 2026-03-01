import { workflow } from '@novu/framework';
import renderEmail from './email';
import { controlValueSchema, payloadSchema } from './schemas';

export const usageReportWorkflow = workflow(
  'Monthly-Usage-Report',
  async ({ step, payload }) => {
    await step.delay(
      'delay',
      async () => ({
        type: 'dynamic' as const,
        dynamicKey: 'payload._nvDelayDuration',
      }),
      {
        skip: () => !payload._nvIsDelayEnabled || !payload._nvDelayDuration,
      }
    );

    await step.email(
      'email',
      async (controls) => {
        const reportDate = new Date(payload.dateRangeFrom as string);
        const monthName = reportDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
        const year = reportDate.getUTCFullYear().toString();
        const subject = controls.subject
          .replace('{orgName}', payload.organizationName)
          .replace('{month}', monthName)
          .replace('{year}', year);

        return {
          subject,
          body: await renderEmail(payloadSchema.parse(payload), controls),
        };
      },
      {
        controlSchema: controlValueSchema,
      }
    );
  },
  {
    payloadSchema: payloadSchema,
  }
);
