import { z } from 'zod';

export const controlValueSchema = z.object({
  subject: z.string().default('Your Monthly Novu Usage Report'),
  previewText: z.string().default('Your monthly Novu usage report'),
});

export const payloadSchema = z.object({
  name: z.string().default('Monthly Usage Report'),
  payloadSchema: z
    .object({
      dateRange: z.string().default('Feb 1, 2026 - Feb 28, 2026'),
      messagesSent: z.number().default(12500),
      messagesSentChange: z.number().default(15.5),
      messagesSentUp: z.boolean().default(true),
      usersReached: z.number().default(3420),
      usersReachedChange: z.number().default(8.2),
      usersReachedUp: z.boolean().default(true),
      workflowRuns: z.number().default(4567),
      successRate: z.number().default(98.5),
      userInteractions: z.number().default(890),
      interactionRate: z.number().default(42.3),
      topProviders: z
        .array(
          z.object({
            name: z.string(),
            count: z.number(),
            icon: z.string().optional(),
          })
        )
        .default([
          { name: 'SendGrid', count: 6500 },
          { name: 'Twilio', count: 3200 },
          { name: 'AWS SES', count: 2800 },
        ]),
      topWorkflows: z
        .array(
          z.object({
            name: z.string(),
            count: z.number(),
          })
        )
        .default([
          { name: 'Welcome Email', count: 1200 },
          { name: 'Password Reset', count: 890 },
          { name: 'Weekly Digest', count: 650 },
        ]),
      channels: z
        .array(
          z.object({
            name: z.string(),
            value: z.number(),
            color: z.string(),
            dashArray: z.string(),
          })
        )
        .default([
          { name: 'Email', value: 8500, color: '#3b82f6', dashArray: '0' },
          { name: 'SMS', value: 2300, color: '#10b981', dashArray: '0' },
          { name: 'Push', value: 1200, color: '#f59e0b', dashArray: '0' },
          { name: 'In-App', value: 500, color: '#8b5cf6', dashArray: '0' },
        ]),
      failureRate: z.number().default(1.5),
      topFailures: z
        .array(
          z.object({
            message: z.string(),
            count: z.number(),
            percentage: z.number(),
          })
        )
        .default([
          { message: 'Invalid email address', count: 45, percentage: 40.5 },
          { message: 'Rate limit exceeded', count: 35, percentage: 31.5 },
          { message: 'Provider timeout', count: 31, percentage: 28.0 },
        ]),
      topFailingWorkflows: z
        .array(
          z.object({
            name: z.string(),
            count: z.number(),
          })
        )
        .default([
          { name: 'Marketing Campaign', count: 52 },
          { name: 'Transactional Email', count: 38 },
          { name: 'SMS Verification', count: 21 },
        ]),
      dashboardUrl: z.string().default('https://dashboard.novu.co'),
    })
    .default({
      dateRange: 'Feb 1, 2026 - Feb 28, 2026',
      messagesSent: 12500,
      messagesSentChange: 15.5,
      messagesSentUp: true,
      usersReached: 3420,
      usersReachedChange: 8.2,
      usersReachedUp: true,
      workflowRuns: 4567,
      successRate: 98.5,
      userInteractions: 890,
      interactionRate: 42.3,
      topProviders: [
        { name: 'SendGrid', count: 6500 },
        { name: 'Twilio', count: 3200 },
        { name: 'AWS SES', count: 2800 },
      ],
      topWorkflows: [
        { name: 'Welcome Email', count: 1200 },
        { name: 'Password Reset', count: 890 },
        { name: 'Weekly Digest', count: 650 },
      ],
      channels: [
        { name: 'Email', value: 8500, color: '#3b82f6', dashArray: '0' },
        { name: 'SMS', value: 2300, color: '#10b981', dashArray: '0' },
        { name: 'Push', value: 1200, color: '#f59e0b', dashArray: '0' },
        { name: 'In-App', value: 500, color: '#8b5cf6', dashArray: '0' },
      ],
      failureRate: 1.5,
      topFailures: [
        { message: 'Invalid email address', count: 45, percentage: 40.5 },
        { message: 'Rate limit exceeded', count: 35, percentage: 31.5 },
        { message: 'Provider timeout', count: 31, percentage: 28.0 },
      ],
      topFailingWorkflows: [
        { name: 'Marketing Campaign', count: 52 },
        { name: 'Transactional Email', count: 38 },
        { name: 'SMS Verification', count: 21 },
      ],
      dashboardUrl: 'https://dashboard.novu.co',
    }),
});

export type PayloadSchemaType = z.infer<typeof payloadSchema>;
export type ControlValueSchema = z.infer<typeof controlValueSchema>;
