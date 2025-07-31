import { JSONSchemaEntity } from '@novu/dal';
import { DigestUnitEnum, TimeUnitEnum, UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const delayControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z.enum(['regular']),
    amount: z.number().min(1),
    unit: z.nativeEnum(TimeUnitEnum),
  })
  .strict();

export type DelayControlType = z.infer<typeof delayControlZodSchema>;

export const delayControlSchema = zodToJsonSchema(delayControlZodSchema, defaultOptions) as JSONSchemaEntity;
export const delayUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.DELAY,
  properties: {
    skip: skipStepUiSchema.properties.skip,
    amount: {
      component: UiComponentEnum.DELAY_AMOUNT,
      placeholder: null,
    },
    unit: {
      component: UiComponentEnum.DELAY_UNIT,
      placeholder: DigestUnitEnum.SECONDS,
    },
    type: {
      component: UiComponentEnum.DELAY_TYPE,
      placeholder: 'regular',
    },
  },
};
