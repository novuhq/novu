import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import {
  JSONSchemaDto,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const pushControlZodSchema = z
  .object({
    skip: skipZodSchema,
    subject: z.string(),
    body: z.string(),
  })
  .strict();

export type PushControlType = z.infer<typeof pushControlZodSchema>;

export const pushControlSchema = zodToJsonSchema(
  pushControlZodSchema,
  defaultOptions,
) as JSONSchemaDto;
export const pushUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.PUSH,
  properties: {
    subject: {
      component: UiComponentEnum.PUSH_SUBJECT,
    },
    body: {
      component: UiComponentEnum.PUSH_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
