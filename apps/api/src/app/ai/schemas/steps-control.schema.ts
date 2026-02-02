import { DelayTypeEnum, DigestTypeEnum, RedirectTargetEnum, StepTypeEnum, TimeUnitEnum } from '@novu/shared';
import { z } from 'zod';
import { mailyBodySchema } from './maily.schema';

// Throttle type enum
const ThrottleTypeEnum = {
  FIXED: 'fixed',
  DYNAMIC: 'dynamic',
} as const;

/**
 * AI-compatible control schemas for OpenAI structured outputs. Link: https://platform.openai.com/docs/guides/structured-outputs#supported-schemas
 * OpenAI's strict mode requires all properties to be in the 'required' array.
 * We use .nullable() instead of .optional() to achieve optional-like behavior
 * Don't use .default() for the properties, as it makes it optional in the JSON schema.
 * while keeping properties required.
 * This schemas should be in sync with the workflow steps schemas from the application-generic package.
 */

const redirectUrlRegex =
  /^(?:\{\{[^}]*\}\}.*|(?!mailto:)(?:https?:\/\/[^\s/$.?#][^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)|\/[^\s{}]*(?:\{\{[^}]*\}\}[^\s{}]*)*)$/;

const aiRedirectSchema = z
  .object({
    url: z
      .string()
      .regex(redirectUrlRegex)
      .describe('Redirect URL, must be a valid URL or start with / or {{ variable }}'),
    target: z
      .nativeEnum(RedirectTargetEnum)
      .describe(
        `Redirect target: ${Object.values(RedirectTargetEnum).join(', ')}. Use ${RedirectTargetEnum.SELF} for same window.`
      ),
  })
  .nullable();

const aiActionSchema = z
  .object({
    label: z.string().describe('Label for the action button'),
    redirect: aiRedirectSchema.nullable().describe('Redirect configuration for the action'),
  })
  .nullable();

const aiInAppSubjectRequiredSchema = z.object({
  subject: z.string().min(1).describe('In-app notification title'),
  body: z.string().nullable().describe('In-app notification body'),
  avatar: z.string().regex(redirectUrlRegex).nullable().describe('Avatar image URL for the in-app notification'),
  primaryAction: aiActionSchema.describe('Primary action button for the in-app notification'),
  secondaryAction: aiActionSchema.describe('Secondary action button for the in-app notification'),
  redirect: aiRedirectSchema.describe('Redirect configuration for the in-app notification'),
});

const aiInAppBodyRequiredSchema = z.object({
  subject: z.string().nullable().describe('In-app notification title'),
  body: z.string().min(1).describe('In-app notification body'),
  avatar: z.string().regex(redirectUrlRegex).nullable().describe('Avatar image URL for the in-app notification'),
  primaryAction: aiActionSchema.describe('Primary action button for the in-app notification'),
  secondaryAction: aiActionSchema.describe('Secondary action button for the in-app notification'),
  redirect: aiRedirectSchema.describe('Redirect configuration for the in-app notification'),
});

export const aiInAppControlSchema = z.union([aiInAppSubjectRequiredSchema, aiInAppBodyRequiredSchema]);

export const aiSmsControlSchema = z.object({
  body: z.string().min(1).describe('SMS message body. Keep messages under 160 characters to avoid splitting'),
});

export const aiPushControlSchema = z.object({
  subject: z
    .string()
    .min(1)
    .describe(
      'Push notification title. Title (subject) should be under 50 characters (gets truncated on most devices)'
    ),
  body: z.string().min(1).describe('Push notification body. Body should be under 150 characters for full visibility'),
});

export const aiChatControlSchema = z.object({
  body: z.string().min(1).describe('Chat message body. Be specific about what the user should do'),
});

const aiDelayRegularControlSchema = z.object({
  type: z.literal(DelayTypeEnum.REGULAR).describe('Regular delay type, always use "regular" for AI generation'),
  amount: z.number().min(1).describe('Amount of time to delay'),
  unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for delay'),
});

const aiDelayTimedControlSchema = z.object({
  type: z.literal(DelayTypeEnum.TIMED).describe('Timed delay type, always use "timed" for AI generation'),
  cron: z.string().min(1).describe('Cron expression for timed delay'),
});

export const aiDelayControlSchema = z.discriminatedUnion('type', [
  aiDelayRegularControlSchema,
  aiDelayTimedControlSchema,
]);

const aiDigestRegularControlSchema = z.object({
  type: z
    .literal(DigestTypeEnum.REGULAR)
    .nullable()
    .describe('Regular digest type, always use "regular" for AI generation'),
  amount: z.number().min(1).describe('Amount of time for digest window'),
  unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for digest window'),
  digestKey: z.string().nullable().describe('Key to group notifications for digest'),
});

const aiDigestTimedControlSchema = z.object({
  type: z.literal(DigestTypeEnum.TIMED).nullable().describe('Timed digest type, always use "timed" for AI generation'),
  cron: z.string().min(1).describe('Cron expression for timed digest'),
  digestKey: z.string().nullable().describe('Key to group notifications for digest'),
});

export const aiDigestControlSchema = z.union([aiDigestRegularControlSchema, aiDigestTimedControlSchema]);

const aiThrottleFixedControlSchema = z.object({
  type: z.literal(ThrottleTypeEnum.FIXED).describe('Fixed throttle type, always use "fixed" for AI generation'),
  amount: z.number().min(1).describe('Amount of time for throttle window'),
  unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for throttle window'),
  dynamicKey: z.string().nullable().describe('Key to group notifications for throttle'),
  threshold: z.number().min(1).describe('Threshold for throttle'),
  throttleKey: z.string().nullable().describe('Key to group throttle rules'),
});

const aiThrottleDynamicControlSchema = z.object({
  type: z.literal(ThrottleTypeEnum.DYNAMIC).describe('Dynamic throttle type, always use "dynamic" for AI generation'),
  dynamicKey: z.string().min(1).describe('Key to group notifications for throttle'),
  threshold: z.number().min(1).describe('Threshold for throttle'),
  throttleKey: z.string().nullable().describe('Key to group throttle rules'),
});

export const aiThrottleControlSchema = z.union([aiThrottleFixedControlSchema, aiThrottleDynamicControlSchema]);

const aiEmailBlockControlSchema = z.object({
  editorType: z.literal('block').describe('Block editor mode, always use "block" for AI generation'),
  subject: z.string().min(1).describe('Email subject line'),
  body: mailyBodySchema.describe('Email body in Maily TipTap JSON format'),
});

const aiEmailHtmlControlSchema = z.object({
  editorType: z.literal('html').describe('HTML editor mode, always use "html" for AI generation'),
  subject: z.string().min(1).describe('Email subject line'),
  body: z
    .string()
    .min(1)
    .describe(
      'Email body in HTML format. Use semantic HTML with inline styles. Structure with headings, paragraphs, and styled buttons.'
    ),
});

export const aiEmailControlSchema = z.discriminatedUnion('editorType', [
  aiEmailBlockControlSchema,
  aiEmailHtmlControlSchema,
]);

export const stepInputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-email")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  intent: z.string().describe('Brief description of what this step should accomplish'),
});

export const emailStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-email")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.EMAIL),
  controlValues: aiEmailControlSchema,
});

export const inAppStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-in-app")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.IN_APP),
  controlValues: aiInAppControlSchema,
});

export const smsStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-sms")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.SMS),
  controlValues: aiSmsControlSchema,
});

export const pushStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-push")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.PUSH),
  controlValues: aiPushControlSchema,
});

export const chatStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-chat")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.CHAT),
  controlValues: aiChatControlSchema,
});

export const digestStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-digest")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.DIGEST),
  controlValues: aiDigestControlSchema,
});

export const delayStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-delay")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.DELAY),
  controlValues: aiDelayControlSchema,
});

export const throttleStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-throttle")'),
  name: z.string().min(1).max(100).describe('Human readable step name, never in kebab-case'),
  type: z.literal(StepTypeEnum.THROTTLE),
  controlValues: aiThrottleControlSchema,
});
