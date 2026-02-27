import { DelayTypeEnum, DigestTypeEnum, RedirectTargetEnum, StepTypeEnum, TimeUnitEnum } from '@novu/shared';
import { z } from 'zod';
import { mailyBodySchema } from './maily.schema';

// Throttle type enum
const ThrottleTypeEnum = {
  FIXED: 'fixed',
  DYNAMIC: 'dynamic',
} as const;

const aiJsonLogicVarSchema = z
  .object({
    var: z
      .string()
      .describe(
        'Path to the variable value. Use "payload." prefix for trigger payload data (e.g., "payload.amount"), "subscriber." prefix for subscriber data (e.g., "subscriber.firstName")'
      ),
  })
  .describe('Variable reference to access payload or subscriber data');

const aiJsonLogicValueSchema = z.union([
  z.string().describe('String literal value'),
  z.number().describe('Numeric literal value'),
  z.boolean().describe('Boolean literal value'),
  z.null().describe('Null value'),
  aiJsonLogicVarSchema,
]);

type JsonLogicCondition =
  | { and: JsonLogicCondition[] }
  | { or: JsonLogicCondition[] }
  | { '!': JsonLogicCondition[] }
  | { '==': z.infer<typeof aiJsonLogicValueSchema>[] }
  | { '!=': z.infer<typeof aiJsonLogicValueSchema>[] }
  | { '>': z.infer<typeof aiJsonLogicValueSchema>[] }
  | { '>=': z.infer<typeof aiJsonLogicValueSchema>[] }
  | { '<': z.infer<typeof aiJsonLogicValueSchema>[] }
  | { '<=': z.infer<typeof aiJsonLogicValueSchema>[] }
  | { in: unknown[] };

const aiJsonLogicComparisonSchema = z.union([
  z
    .object({
      '==': z.array(aiJsonLogicValueSchema).min(2).max(2).describe('Array of exactly 2 values to compare for equality'),
    })
    .describe('Equality comparison'),
  z
    .object({
      '!=': z
        .array(aiJsonLogicValueSchema)
        .min(2)
        .max(2)
        .describe('Array of exactly 2 values to compare for inequality'),
    })
    .describe('Inequality comparison'),
  z
    .object({
      '>': z.array(aiJsonLogicValueSchema).min(2).max(2).describe('Array of exactly 2 values: first > second'),
    })
    .describe('Greater than comparison'),
  z
    .object({
      '>=': z.array(aiJsonLogicValueSchema).min(2).max(2).describe('Array of exactly 2 values: first >= second'),
    })
    .describe('Greater than or equal comparison'),
  z
    .object({
      '<': z.array(aiJsonLogicValueSchema).min(2).max(2).describe('Array of exactly 2 values: first < second'),
    })
    .describe('Less than comparison'),
  z
    .object({
      '<=': z.array(aiJsonLogicValueSchema).min(2).max(2).describe('Array of exactly 2 values: first <= second'),
    })
    .describe('Less than or equal comparison'),
  z
    .object({
      in: z
        .array(z.union([aiJsonLogicValueSchema, z.array(aiJsonLogicValueSchema)]))
        .min(2)
        .max(2)
        .describe(
          'Array of [value, array] - checks if first element exists in second element (which should be an array)'
        ),
    })
    .describe('Check if value exists in array'),
]);

/**
 * Unrolled recursive condition schema (3 levels deep) to satisfy
 * OpenAI structured output requirements — z.lazy() produces schemas
 * without a 'type' key on recursive items which OpenAI rejects.
 */
function buildConditionLevel(innerSchema: z.ZodType) {
  return z.union([
    z
      .object({
        and: z.array(innerSchema).min(1).describe('Array of conditions that must ALL be true'),
      })
      .describe('Logical AND - all conditions must be true'),
    z
      .object({
        or: z.array(innerSchema).min(1).describe('Array of conditions where at least ONE must be true'),
      })
      .describe('Logical OR - at least one condition must be true'),
    z
      .object({
        '!': z.array(innerSchema).length(1).describe('Single condition to negate'),
      })
      .describe('Logical NOT - negates the condition'),
    aiJsonLogicComparisonSchema,
  ]);
}

const aiJsonLogicConditionLevel0 = aiJsonLogicComparisonSchema;
const aiJsonLogicConditionLevel1 = buildConditionLevel(aiJsonLogicConditionLevel0);
const aiJsonLogicConditionSchema: z.ZodType<JsonLogicCondition> = buildConditionLevel(aiJsonLogicConditionLevel1);

export const aiSkipConditionSchema = z
  .union([aiJsonLogicConditionSchema, aiJsonLogicVarSchema])
  .nullable()
  .describe(
    'JSONLogic condition for conditionally executing the workflow step. When condition evaluates to true, step is executed. Use comparison operators with variable references. Examples: { "==": [{ "var": "subscriber.isOnline" }, "false"] } step is executed when subscriber is not online, { "!=": [{ "var": "payload.priority" }, "high"] } step is executed when is not high priority.'
  );

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

const aiDigestRegularControlSchema = z
  .object({
    type: z
      .literal(DigestTypeEnum.REGULAR)
      .nullable()
      .describe('Regular digest type, always use "regular" for AI generation'),
    amount: z.number().min(1).describe('Amount of time for digest window'),
    unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for digest window'),
    digestKey: z.string().nullable().describe('Key to group notifications for digest'),
    lookBackWindow: z
      .object({
        amount: z.number().min(1).describe('Amount of time for look back window'),
        unit: z.nativeEnum(TimeUnitEnum).describe('Time unit for look back window'),
        extendToSchedule: z.boolean().nullable().describe('Extend the digest window to the schedule'),
      })
      .nullable()
      .describe('Look back window for digest'),
    extendToSchedule: z.boolean().nullable().describe('Extend the digest window to the schedule'),
  })
  .describe(
    'Always groups events within the configured time window. A digest is created on the first event and delivered only when the window ends.'
  );

const aiDigestTimedControlSchema = z
  .object({
    type: z
      .literal(DigestTypeEnum.TIMED)
      .nullable()
      .describe('Timed digest type, always use "timed" for AI generation'),
    cron: z.string().min(1).describe('Cron expression for timed digest'),
    digestKey: z.string().nullable().describe('Key to group notifications for digest'),
    extendToSchedule: z.boolean().nullable().describe('Extend the digest window to the schedule'),
  })
  .describe(
    'Collects events until a specific scheduled time (UTC). Once the scheduled time is reached, the workflow continues with all collected events.'
  );

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
  name: z.string().min(1).max(100).describe('Standardized step name based on type: "In-App Step" for in_app, "Email Step" for email, "SMS Step" for sms, "Push Step" for push, "Chat Step" for chat, "Delay Step" for delay, "Digest Step" for digest, "Throttle Step" for throttle'),
  intent: z.string().describe('Brief description of what this step should accomplish'),
  stepType: z
    .enum([
      StepTypeEnum.IN_APP,
      StepTypeEnum.EMAIL,
      StepTypeEnum.PUSH,
      StepTypeEnum.CHAT,
      StepTypeEnum.SMS,
      StepTypeEnum.DELAY,
      StepTypeEnum.DIGEST,
      StepTypeEnum.THROTTLE,
    ])
    .describe('Type of the step to add'),
  skip: aiSkipConditionSchema,
});

export const editStepInputSchema = z.object({
  stepId: z.string().describe('Unique step identifier of the step to edit'),
  type: z
    .enum([
      StepTypeEnum.IN_APP,
      StepTypeEnum.EMAIL,
      StepTypeEnum.PUSH,
      StepTypeEnum.CHAT,
      StepTypeEnum.SMS,
      StepTypeEnum.DELAY,
      StepTypeEnum.DIGEST,
      StepTypeEnum.THROTTLE,
    ])
    .describe('Type of the step to edit'),
  intent: z.string().describe('Description of the change the user wants to make'),
});

export const removeStepInputSchema = z.object({
  stepId: z.string().describe('Unique step identifier of the step to remove'),
  reason: z.string().describe('Brief reason for removing the step'),
});

export const moveStepInputSchema = z.object({
  stepId: z.string().describe('Unique step identifier of the step to move'),
  toIndex: z.number().int().min(0).describe('Target 0-based index position in the workflow steps array'),
});

export const addStepInBetweenInputSchema = stepInputSchema.extend({
  afterStepId: z
    .string()
    .describe(
      'Step ID of the step after which to insert the new step. The new step will be placed immediately after this step.'
    ),
});

export const updateStepConditionsInputSchema = z.object({
  stepId: z.string().describe('Unique step identifier of the step to update'),
  intent: z
    .string()
    .describe(
      'Description of the condition to apply (e.g., "only send when subscriber is offline", "skip if In-App was already read", "remove condition")'
    ),
});

export const updateStepConditionsOutputSchema = z.object({
  skip: aiSkipConditionSchema,
});

export const emailStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-email")'),
  name: z.string().min(1).max(100).describe('Must be exactly "Email Step"'),
  type: z.literal(StepTypeEnum.EMAIL),
  controlValues: aiEmailControlSchema,
});

export const inAppStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-in-app")'),
  name: z.string().min(1).max(100).describe('Must be exactly "In-App Step"'),
  type: z.literal(StepTypeEnum.IN_APP),
  controlValues: aiInAppControlSchema,
});

export const smsStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-sms")'),
  name: z.string().min(1).max(100).describe('Must be exactly "SMS Step"'),
  type: z.literal(StepTypeEnum.SMS),
  controlValues: aiSmsControlSchema,
});

export const pushStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-push")'),
  name: z.string().min(1).max(100).describe('Must be exactly "Push Step"'),
  type: z.literal(StepTypeEnum.PUSH),
  controlValues: aiPushControlSchema,
});

export const chatStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-chat")'),
  name: z.string().min(1).max(100).describe('Must be exactly "Chat Step"'),
  type: z.literal(StepTypeEnum.CHAT),
  controlValues: aiChatControlSchema,
});

export const digestStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-digest")'),
  name: z.string().min(1).max(100).describe('Must be exactly "Digest Step"'),
  type: z.literal(StepTypeEnum.DIGEST),
  controlValues: aiDigestControlSchema,
});

export const delayStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-delay")'),
  name: z.string().min(1).max(100).describe('Must be exactly "Delay Step"'),
  type: z.literal(StepTypeEnum.DELAY),
  controlValues: aiDelayControlSchema,
});

export const throttleStepOutputSchema = z.object({
  stepId: z.string().describe('Unique step identifier (lowercase, kebab-case, e.g., "welcome-throttle")'),
  name: z.string().min(1).max(100).describe('Must be exactly "Throttle Step"'),
  type: z.literal(StepTypeEnum.THROTTLE),
  controlValues: aiThrottleControlSchema,
});
