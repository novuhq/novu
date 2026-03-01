import { z } from 'zod';

export const controlValueSchema = z.object({
  subject: z.string().default('Your Novu Usage Report for {orgName} - {month} {year}'),
  previewText: z.string().default('Your Monthly Novu usage report'),
});

export const payloadSchema = z.object({
  organizationName: z.string(),
  dateRangeFrom: z.string().datetime(),
  dateRangeTo: z.string().datetime().optional(),
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
    })
  ),
  dashboardUrl: z.string(),
  _nvDelayDuration: z.string().datetime().optional(),
  _nvIsDelayEnabled: z.boolean().optional(),
});

export type PayloadSchemaType = z.infer<typeof payloadSchema>;
export type ControlValueSchema = z.infer<typeof controlValueSchema>;
