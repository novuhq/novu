import { JSONSchemaEntity } from '@novu/dal';
import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const toolControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
    enabledIntegrations: z.array(z.string()).optional(),
  })
  .strict();

export type ToolControlType = z.infer<typeof toolControlZodSchema>;

export const toolControlSchema = zodToJsonSchema(toolControlZodSchema, defaultOptions) as JSONSchemaEntity;
export const toolUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.TOOL,
  properties: {
    body: {
      component: UiComponentEnum.TOOL_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
