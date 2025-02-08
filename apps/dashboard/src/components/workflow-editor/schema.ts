import * as z from 'zod';
import { type JSONSchemaDefinition, ChannelTypeEnum } from '@novu/shared';

export const MAX_TAG_ELEMENTS = 16;
export const MAX_TAG_LENGTH = 32;
export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 256;

export const workflowSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  workflowId: z.string(),
  tags: z
    .array(z.string().min(0).max(MAX_TAG_LENGTH))
    .max(MAX_TAG_ELEMENTS)
    .refine((tags) => tags?.every((tag) => tag.length <= MAX_TAG_LENGTH), {
      message: `Tags must be less than ${MAX_TAG_LENGTH} characters`,
    })
    .optional()
    .refine((tags) => new Set(tags).size === tags?.length, {
      message: 'Duplicate tags are not allowed',
    }),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
});

export const stepSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  stepId: z.string(),
});

export const buildDynamicFormSchema = ({
  to,
}: {
  to: JSONSchemaDefinition;
}): z.ZodObject<{
  to: z.ZodObject<Record<string, z.ZodTypeAny>>;
  payload: z.ZodEffects<z.ZodString, any, string>;
}> => {
  const properties = typeof to === 'object' ? (to.properties ?? {}) : {};
  const requiredFields = typeof to === 'object' ? (to.required ?? []) : [];
  const keys: Record<string, z.ZodTypeAny> = Object.keys(properties).reduce((acc, key) => {
    const value = properties[key];
    if (typeof value !== 'object') {
      return acc;
    }

    const isRequired = requiredFields.includes(key);
    let zodValue: z.ZodString | z.ZodNumber | z.ZodOptional<z.ZodString | z.ZodNumber>;
    if (value.type === 'string') {
      zodValue = z.string().min(1);
      if (value.format === 'email') {
        zodValue = zodValue.email();
      }
    } else {
      zodValue = z.number().min(1);
    }
    if (!isRequired) {
      zodValue = zodValue.optional();
    }

    return { ...acc, [key]: zodValue };
  }, {});

  return z.object({
    to: z
      .object({
        ...keys,
      })
      .passthrough(),
    payload: z.string().transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        ctx.addIssue({ code: 'custom', message: 'Payload must be valid JSON' });
        return z.NEVER;
      }
    }),
  });
};

export type TestWorkflowFormType = z.infer<ReturnType<typeof buildDynamicFormSchema>>;

const ChannelPreferenceSchema = z.object({
  enabled: z.boolean().default(true),
});

const ChannelsSchema = z.object(
  Object.fromEntries(Object.values(ChannelTypeEnum).map((channel) => [channel, ChannelPreferenceSchema]))
);

const WorkflowPreferenceSchema = z.object({
  enabled: z.boolean().default(true),
  readOnly: z.boolean().default(false),
});

const WorkflowPreferencesSchema = z.object({
  all: WorkflowPreferenceSchema,
  channels: ChannelsSchema,
});

export const UserPreferencesFormSchema = z.object({
  user: WorkflowPreferencesSchema.nullable(),
});
