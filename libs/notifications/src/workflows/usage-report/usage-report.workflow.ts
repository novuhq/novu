import { workflow } from '@novu/framework';
import renderEmail from './email';
import { controlValueSchema, payloadSchema } from './schemas';

export const usageReportWorkflow = workflow(
  'monthly-usage-report',
  async ({ step, payload }) => {
    await step.email(
      'email',
      async (controls) => {
        const parsedPayload = payloadSchema.parse(payload);

        return {
          subject: controls.subject,
          body: await renderEmail(parsedPayload, controls),
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
