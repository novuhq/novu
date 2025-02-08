import {
  JSONSchemaDto,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const emailControlZodSchema = z
  .object({
    skip: skipZodSchema,
    /*
     * todo: we need to validate the email editor (body) by type and not string,
     * updating it to TipTapSchema will break the existing upsert issues generation
     */
    body: z.string().optional().default(''),
    subject: z.string().optional().default(''),
  })
  .strict();

export type EmailControlType = z.infer<typeof emailControlZodSchema>;

export const emailControlSchema = zodToJsonSchema(
  emailControlZodSchema,
  defaultOptions,
) as JSONSchemaDto;
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
  },
};
