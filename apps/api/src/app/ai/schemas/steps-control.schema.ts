import { DelayTypeEnum, DigestTypeEnum, RedirectTargetEnum, TimeUnitEnum } from '@novu/shared';
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
    label: z.string(),
    redirect: aiRedirectSchema.nullable(),
  })
  .nullable();

const aiInAppSubjectRequiredSchema = z.object({
  subject: z.string().min(1),
  body: z.string().nullable(),
  avatar: z.string().regex(redirectUrlRegex).nullable(),
  primaryAction: aiActionSchema,
  secondaryAction: aiActionSchema,
  redirect: aiRedirectSchema,
});

const aiInAppBodyRequiredSchema = z.object({
  subject: z.string().nullable(),
  body: z.string().min(1),
  avatar: z.string().regex(redirectUrlRegex).nullable(),
  primaryAction: aiActionSchema,
  secondaryAction: aiActionSchema,
  redirect: aiRedirectSchema,
});

const aiInAppControlSchema = z.union([aiInAppSubjectRequiredSchema, aiInAppBodyRequiredSchema]);

const aiSmsControlSchema = z.object({
  body: z.string().min(1).describe('SMS message body'),
});

const aiPushControlSchema = z.object({
  subject: z.string().min(1).describe('Push notification title'),
  body: z.string().min(1).describe('Push notification body'),
});

const aiChatControlSchema = z.object({
  body: z.string().min(1).describe('Chat message body'),
});

const aiDelayRegularControlSchema = z.object({
  type: z.literal(DelayTypeEnum.REGULAR),
  amount: z.number().min(1).describe('Amount of time to delay'),
  unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for delay'),
});

const aiDelayTimedControlSchema = z.object({
  type: z.literal(DelayTypeEnum.TIMED),
  cron: z.string().min(1).describe('Cron expression for timed delay'),
});

const aiDelayControlSchema = z.discriminatedUnion('type', [aiDelayRegularControlSchema, aiDelayTimedControlSchema]);

const aiDigestRegularControlSchema = z.object({
  type: z.literal(DigestTypeEnum.REGULAR).nullable(),
  amount: z.number().min(1).describe('Amount of time for digest window'),
  unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for digest window'),
  digestKey: z.string().nullable().describe('Key to group notifications for digest'),
});

const aiDigestTimedControlSchema = z.object({
  type: z.literal(DigestTypeEnum.TIMED).nullable(),
  cron: z.string().min(1).describe('Cron expression for timed digest'),
  digestKey: z.string().nullable().describe('Key to group notifications for digest'),
});

const aiDigestControlSchema = z.union([aiDigestRegularControlSchema, aiDigestTimedControlSchema]);

const aiThrottleFixedControlSchema = z.object({
  type: z.literal(ThrottleTypeEnum.FIXED).nullable(),
  amount: z.number().min(1).describe('Amount of time for throttle window'),
  unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for throttle window'),
  dynamicKey: z.string().nullable().describe('Key to group notifications for throttle'),
  threshold: z.number().min(1).describe('Threshold for throttle'),
  throttleKey: z.string().nullable().describe('Key to group throttle rules'),
});

const aiThrottleDynamicControlSchema = z.object({
  type: z.literal(ThrottleTypeEnum.DYNAMIC).nullable(),
  dynamicKey: z.string().min(1).describe('Key to group notifications for throttle'),
  threshold: z.number().min(1).describe('Threshold for throttle'),
  throttleKey: z.string().nullable().describe('Key to group throttle rules'),
});

const aiThrottleControlSchema = z.union([aiThrottleFixedControlSchema, aiThrottleDynamicControlSchema]);

const aiEmailBlockControlSchema = z.object({
  editorType: z.literal('block').describe('Block editor mode'),
  subject: z.string().min(1).describe('Email subject line'),
  body: mailyBodySchema.describe('Email body in Maily TipTap JSON format'),
});

const aiEmailHtmlControlSchema = z.object({
  editorType: z.literal('html').describe('HTML editor mode - always use html for AI generation'),
  subject: z.string().min(1).describe('Email subject line'),
  body: z
    .string()
    .min(1)
    .describe(
      'Email body in HTML format. Use semantic HTML with inline styles. Structure with headings, paragraphs, and styled buttons.'
    ),
});

const aiEmailControlSchema = z.discriminatedUnion('editorType', [aiEmailBlockControlSchema, aiEmailHtmlControlSchema]);

/**
 * Wrapped step control schemas for OpenAI structured outputs.
 *
 * OpenAI structured outputs don't support unions/discriminatedUnions at the root level.
 * By wrapping each schema in an object with a step-type key, we ensure the root is always
 * a plain object, while unions can exist nested inside.
 *
 * Example: Instead of returning { subject: "...", body: "..." } directly,
 * we return { root: { subject: "...", body: "..." } }
 */
export const wrappedEmailControlSchema = z.object({
  root: aiEmailControlSchema,
});

export const wrappedInAppControlSchema = z.object({
  root: aiInAppControlSchema,
});

export const wrappedSmsControlSchema = z.object({
  root: aiSmsControlSchema,
});

export const wrappedPushControlSchema = z.object({
  root: aiPushControlSchema,
});

export const wrappedChatControlSchema = z.object({
  root: aiChatControlSchema,
});

export const wrappedDelayControlSchema = z.object({
  root: aiDelayControlSchema,
});

export const wrappedDigestControlSchema = z.object({
  root: aiDigestControlSchema,
});

export const wrappedThrottleControlSchema = z.object({
  root: aiThrottleControlSchema,
});
