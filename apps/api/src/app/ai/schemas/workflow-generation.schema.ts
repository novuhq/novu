import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MAX_TAG_LENGTH, SeverityLevelEnum } from '@novu/shared';
import { z } from 'zod';

const severityValues = Object.values(SeverityLevelEnum) as [SeverityLevelEnum, ...SeverityLevelEnum[]];

export const organizationMetaInputSchema = z.object({}).describe('No input required');

export const organizationMetaOutputSchema = z.object({
  channels: z.array(z.string()).describe('Available channels'),
});

export const workflowMetadataInputSchema = z.object({
  userRequest: z.string().describe('The user request that describes what workflow they want to create'),
});

export const workflowMetadataOutputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(MAX_NAME_LENGTH)
    .describe('Human readable workflow name (e.g., "Welcome Email", "Order Confirmation")'),
  description: z
    .string()
    .max(MAX_DESCRIPTION_LENGTH)
    .nullable()
    .describe('Brief description of what this workflow does'),
  tags: z
    .array(z.string().max(MAX_TAG_LENGTH))
    .max(5)
    .nullable()
    .describe('Tags for categorizing the workflow (max 5)'),
  severity: z
    .enum(severityValues)
    .describe('Workflow severity: HIGH for critical alerts, MEDIUM for important, LOW for informational'),
  critical: z
    .boolean()
    .describe(
      'Whether the workflow is critical. Deliver messages regardless of user preferences e.g., account blocked, security issues'
    ),
});

export const updateWorkflowMetadataInputSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH).optional().describe('Updated workflow name'),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).nullable().optional().describe('Updated workflow description'),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(5).nullable().optional().describe('Updated tags'),
  severity: z.enum(severityValues).optional().describe('Updated severity level'),
  critical: z.boolean().optional().describe('Updated critical flag'),
});
