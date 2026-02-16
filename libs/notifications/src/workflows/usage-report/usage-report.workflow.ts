import { workflow } from '@novu/framework';
import renderEmail from './email';
import { controlValueSchema, payloadSchema } from './schemas';

export const usageReportWorkflow = workflow(
  'monthly-usage-report',
  async ({ step, payload }) => {
    const parsedPayload = payloadSchema.parse(payload);

    await step.delay(
      'delay',
      async () => ({
        type: 'dynamic' as const,
        dynamicKey: 'payload._nvDelayDuration',
      }),
      {
        skip: () => !parsedPayload._nvIsDelayEnabled || !parsedPayload._nvDelayDuration,
      }
    );

    await step.email(
      'email',
      async (controls) => {
        return {
          subject: controls.subject,
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
