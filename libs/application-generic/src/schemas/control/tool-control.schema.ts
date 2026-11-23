import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { skipStepUiSchema, skipZodSchema, toControlJsonSchema } from './shared';

export const toolControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
  })
  .strict();

export type ToolControlType = z.infer<typeof toolControlZodSchema>;

export const toolControlSchema = toControlJsonSchema(toolControlZodSchema);
export const toolUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.TOOL,
  properties: {
    body: {
      component: UiComponentEnum.TOOL_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
