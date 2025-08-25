import { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const emailControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string().optional().default(''),
    editorType: z.enum(['block', 'html']).optional().default('block'),
    subject: z.string().min(1),
    disableOutputSanitization: z.boolean().optional(),
    layoutId: z.string().nullish(),
  })
  .strict();

export type EmailControlType = Omit<z.infer<typeof emailControlZodSchema>, 'layoutId'> & {
  layoutId?: string | null;
};

export const emailControlSchema = zodToJsonSchema(emailControlZodSchema, defaultOptions) as JSONSchemaEntity;

export const emailUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.EMAIL,
  properties: {
    body: {
      component: UiComponentEnum.EMAIL_BODY,
    },
    subject: {
      component: UiComponentEnum.TEXT_INLINE_LABEL,
    },
    skip: skipStepUiSchema.properties.skip,
    editorType: {
      component: UiComponentEnum.EMAIL_EDITOR_SELECT,
      placeholder: 'block',
    },
    disableOutputSanitization: {
      component: UiComponentEnum.DISABLE_SANITIZATION_SWITCH,
      placeholder: false,
    },
    layoutId: {
      component: UiComponentEnum.LAYOUT_SELECT,
    },
  },
};
