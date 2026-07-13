import { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const signalsControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
    enabledIntegrations: z.array(z.string()).optional(),
  })
  .strict();

export type SignalsControlType = z.infer<typeof signalsControlZodSchema>;

export const signalsControlSchema = zodToJsonSchema(signalsControlZodSchema, defaultOptions) as JSONSchemaEntity;
export const signalsUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.SIGNALS,
  properties: {
    body: {
      component: UiComponentEnum.SIGNALS_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
