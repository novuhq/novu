import { JSONSchemaDto, UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const emailControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string().optional().default(''),
    subject: z.string(),
    disableOutputSanitization: z.boolean().optional(),
  })
  .strict();

export type EmailControlType = z.infer<typeof emailControlZodSchema>;

export const emailControlSchema = zodToJsonSchema(emailControlZodSchema, defaultOptions) as JSONSchemaDto;
export const emailUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.EMAIL,
  properties: {
    body: {
      component: UiComponentEnum.BLOCK_EDITOR,
    },
    subject: {
      component: UiComponentEnum.TEXT_INLINE_LABEL,
    },
    skip: skipStepUiSchema.properties.skip,
    disableOutputSanitization: {
      component: UiComponentEnum.DISABLE_SANITIZATION_SWITCH,
      placeholder: false,
    },
  },
};
