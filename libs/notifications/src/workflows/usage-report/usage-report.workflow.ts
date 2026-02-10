import { workflow } from '@novu/framework';
import { z } from 'zod';
import { renderUsageReportEmail } from './email';

export const usageReportWorkflow = workflow(
  'monthly-usage-report',
  async ({ step, payload }) => {
    await step.email(
      'email',
      async (controls) => {
        return {
          subject: controls.subject,
          body: await renderUsageReportEmail(payload, controls),
        };
      },
      {
        controlSchema: z.object({
          subject: z.string().default('Your Monthly Novu Usage Report'),
          previewText: z.string().default('Your monthly Novu usage report'),
        }),
      }
    );
  },
  {
    name: 'Monthly Usage Report',
    payloadSchema: z.object({
      dateRange: z.string(),
      messagesSent: z.number(),
      messagesSentChange: z.number(),
      messagesSentUp: z.boolean(),
      usersReached: z.number(),
      usersReachedChange: z.number(),
      usersReachedUp: z.boolean(),
      workflowRuns: z.number(),
      successRate: z.number(),
      userInteractions: z.number(),
      interactionRate: z.number(),
      topProviders: z.array(
        z.object({
          name: z.string(),
          count: z.number(),
          icon: z.string().optional(),
        })
      ),
      topWorkflows: z.array(
        z.object({
          name: z.string(),
          count: z.number(),
        })
      ),
      channels: z.array(
        z.object({
          name: z.string(),
          value: z.number(),
          color: z.string(),
          dashArray: z.string(),
        })
      ),
      failureRate: z.number(),
      topFailures: z.array(
        z.object({
          message: z.string(),
          count: z.number(),
          percentage: z.number(),
        })
      ),
      topFailingWorkflows: z.array(
        z.object({
          name: z.string(),
          count: z.number(),
        })
      ),
      dashboardUrl: z.string(),
    }),
  }
);
