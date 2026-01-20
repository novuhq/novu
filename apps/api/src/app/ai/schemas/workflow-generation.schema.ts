import { MAX_NAME_LENGTH, SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { z } from 'zod';
import {
  wrappedChatControlSchema,
  wrappedDelayControlSchema,
  wrappedDigestControlSchema,
  wrappedEmailControlSchema,
  wrappedInAppControlSchema,
  wrappedPushControlSchema,
  wrappedSmsControlSchema,
  wrappedThrottleControlSchema,
} from './steps-control.schema';

const severityValues = Object.values(SeverityLevelEnum) as [SeverityLevelEnum, ...SeverityLevelEnum[]];

const stepTypeValues = [
  StepTypeEnum.EMAIL,
  StepTypeEnum.IN_APP,
  StepTypeEnum.SMS,
  StepTypeEnum.PUSH,
  StepTypeEnum.CHAT,
  StepTypeEnum.DELAY,
  StepTypeEnum.DIGEST,
  StepTypeEnum.THROTTLE,
] as const;

export type SupportedStepType = (typeof stepTypeValues)[number];

export const channelRecommendationSchema = z.object({
  channel: z.string().describe('Channel type (e.g., email, sms, push)'),
  reason: z.string().describe('Reason for recommending this channel'),
  priority: z.number().int().min(1).describe('Priority of the channel (1 = highest)'),
});

export const workflowReasoningSchema = z.object({
  summary: z.string().describe('Summary of the AI reasoning for this workflow design'),
  channelRecommendations: z.array(channelRecommendationSchema).describe('List of recommended channels with reasoning'),
  bestPractices: z.array(z.string()).describe('Best practices applied to this workflow'),
});

/**
 * Phase 1: Generate workflow metadata and step structure (without controlValues)
 * This keeps the schema simple for OpenAI structured outputs
 */
export const stepMetadataSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH).describe('Step name (e.g., "Welcome Email", "Order Confirmation Push")'),
  type: z.enum(stepTypeValues).describe('Step type'),
});

export const workflowMetadataSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH).describe('Human-readable workflow name'),
  description: z.string().nullable().describe('Workflow description'),
  tags: z.array(z.string()).max(16).nullable().describe('Tags for categorizing the workflow (max 5)'),
  severity: z.enum(severityValues).describe('Severity of the workflow'),
  steps: z.array(stepMetadataSchema).min(1).describe('Workflow steps in execution order (name and type only)'),
  reasoning: workflowReasoningSchema.describe('AI reasoning for the workflow design'),
});

/**
 * Phase 2: Generate step controlValues based on step type
 * Each step type has its own focused schema wrapped in an object
 * to satisfy OpenAI's requirement for root-level object schemas.
 *
 * The wrapper key matches the step type, allowing extraction after generation.
 */
export const stepControlValueSchemas = {
  [StepTypeEnum.EMAIL]: wrappedEmailControlSchema,
  [StepTypeEnum.IN_APP]: wrappedInAppControlSchema,
  [StepTypeEnum.SMS]: wrappedSmsControlSchema,
  [StepTypeEnum.PUSH]: wrappedPushControlSchema,
  [StepTypeEnum.CHAT]: wrappedChatControlSchema,
  [StepTypeEnum.DELAY]: wrappedDelayControlSchema,
  [StepTypeEnum.DIGEST]: wrappedDigestControlSchema,
  [StepTypeEnum.THROTTLE]: wrappedThrottleControlSchema,
} as const;

export type StepMetadata = z.infer<typeof stepMetadataSchema>;
export type WorkflowMetadata = z.infer<typeof workflowMetadataSchema>;
export type ChannelRecommendation = z.infer<typeof channelRecommendationSchema>;
export type WorkflowReasoning = z.infer<typeof workflowReasoningSchema>;
