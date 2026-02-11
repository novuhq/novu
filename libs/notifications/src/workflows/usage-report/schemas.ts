import { z } from 'zod';

export const controlValueSchema = z.object({
  subject: z.string().default('Your Monthly Novu Usage Report'),
  previewText: z.string().default('Your monthly Novu usage report'),
});

export const payloadSchema = z.object({
  name: z.string(),
  dateRange: z.string(),
  messagesSent: z.number(),
  messagesSentChange: z.number(),
  messagesSentUp: z.boolean(),
  usersReached: z.number(),
  usersReachedChange: z.number(),
  usersReachedUp: z.boolean(),
  workflowRuns: z.number(),
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
});

export type PayloadSchemaType = z.infer<typeof payloadSchema>;
export type ControlValueSchema = z.infer<typeof controlValueSchema>;
