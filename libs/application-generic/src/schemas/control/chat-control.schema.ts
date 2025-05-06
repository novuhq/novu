import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  JSONSchemaDto,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const chatControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
  })
  .strict();

export type ChatControlType = z.infer<typeof chatControlZodSchema>;

export const chatControlSchema = zodToJsonSchema(
  chatControlZodSchema,
  defaultOptions,
) as JSONSchemaDto;
export const chatUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.CHAT,
  properties: {
    body: {
      component: UiComponentEnum.CHAT_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
