import * as z from 'zod';
import type { WorkflowTestDataResponseDto } from '@novu/shared';
import { StepTypeEnum } from '@/utils/enums';
import { capitalize } from '@/utils/string';

const enabledSchema = z.object({
  enabled: z.boolean(),
});

// Reusable schema for channels
const channelsSchema = z.object({
  in_app: enabledSchema,
  sms: enabledSchema,
  email: enabledSchema,
  push: enabledSchema,
  chat: enabledSchema,
});

export const workflowSchema = z.object({
  name: z.string(),
  workflowId: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  critical: z.boolean().optional(),
  steps: z.array(
    z
      .object({
        name: z.string(),
        type: z.nativeEnum(StepTypeEnum),
      })
      .passthrough()
  ),
  preferences: z.object({
    /**
     * TODO: Add user schema
     */
    user: z.any().nullable(),
    default: z.object({
      all: z.object({
        enabled: z.boolean(),
        readOnly: z.boolean(),
      }),
      channels: channelsSchema,
    }),
  }),
});

export type JSONSchema = WorkflowTestDataResponseDto['to'];

export const buildDynamicFormSchema = ({
  to,
}: {
  to: JSONSchema;
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
      zodValue = z.string().min(1, `${capitalize(key)} is required`);
      if (value.format === 'email') {
        zodValue = zodValue.email(`${capitalize(key)} must be a valid email`);
      }
    } else {
      zodValue = z.number().min(1, `${capitalize(key)} is required`);
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
        ctx.addIssue({ code: 'custom', message: 'Invalid payload. Payload needs to be a valid JSON.' });
        return z.NEVER;
      }
    }),
  });
};

export type TestWorkflowFormType = z.infer<ReturnType<typeof buildDynamicFormSchema>>;

export const makeObjectFromSchema = ({ properties }: { properties: Readonly<Record<string, JSONSchema>> }) => {
  return Object.keys(properties).reduce((acc, key) => {
    const value = properties[key];
    if (typeof value !== 'object') {
      return acc;
    }

    return { ...acc, [key]: value.default };
  }, {});
};
