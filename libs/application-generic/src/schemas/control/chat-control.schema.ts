import { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const chatControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
    // Optional with no static default so flag-off orgs never persist editorType
    // for empty steps. When a body is present, upsert/sanitize infers 'block'
    // from Maily JSON and 'text' from plain/Liquid content — matching email's
    // persist-a-valid-editorType behavior without forcing a schema default.
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
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
