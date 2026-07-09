import { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const chatControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
    /*
     * No zod default on purpose: existing steps with a plain-string body have no editorType
     * and must not be reported as 'block'. The dashboard derives the effective editor by
     * sniffing the body format and writes editorType explicitly on save.
     */
    editorType: z.enum(['block', 'text']).optional(),
  })
  .strict();

export type ChatControlType = z.infer<typeof chatControlZodSchema>;

export const chatControlSchema = zodToJsonSchema(chatControlZodSchema, defaultOptions) as JSONSchemaEntity;
export const chatUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.CHAT,
  properties: {
    body: {
      component: UiComponentEnum.CHAT_BODY,
    },
    editorType: {
      component: UiComponentEnum.CHAT_EDITOR_SELECT,
      placeholder: 'block',
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
