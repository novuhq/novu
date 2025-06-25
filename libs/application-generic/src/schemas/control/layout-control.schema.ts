import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { JSONSchemaEntity } from '@novu/dal';
import { defaultOptions } from './shared';

const layoutZodSchema = z.object({
  email: z.object({
    content: z.string().min(1),
    editorType: z.enum(['block', 'html']).optional().default('block'),
  }),
});

export const layoutUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.LAYOUT,
  properties: {
    email: {
      component: UiComponentEnum.LAYOUT_EMAIL,
      properties: {
        content: {
          component: UiComponentEnum.EMAIL_BODY,
          placeholder: '',
        },
        editorType: {
          component: UiComponentEnum.EMAIL_EDITOR_SELECT,
          placeholder: 'block',
        },
      },
    },
  },
};

export const layoutControlSchema = zodToJsonSchema(layoutZodSchema, defaultOptions) as JSONSchemaEntity;
