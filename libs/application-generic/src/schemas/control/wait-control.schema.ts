import { JSONSchemaEntity } from '@novu/dal';
import { DigestUnitEnum, TimeUnitEnum, UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const DEFAULT_WAIT_AMOUNT = 24;
export const DEFAULT_WAIT_UNIT = TimeUnitEnum.HOURS;

const waitControlZodSchema = z
  .object({
    skip: skipZodSchema,
    amount: z.number().min(1).default(DEFAULT_WAIT_AMOUNT),
    unit: z.nativeEnum(TimeUnitEnum).default(DEFAULT_WAIT_UNIT),
  })
  .strict();

export const waitControlSchema = zodToJsonSchema(waitControlZodSchema, defaultOptions) as JSONSchemaEntity;

export type WaitControlType = z.infer<typeof waitControlZodSchema>;

export const waitUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.WAIT,
  properties: {
    skip: skipStepUiSchema.properties.skip,
    amount: {
      component: UiComponentEnum.DELAY_AMOUNT,
      placeholder: DEFAULT_WAIT_AMOUNT,
    },
    unit: {
      component: UiComponentEnum.DELAY_UNIT,
      placeholder: DigestUnitEnum.HOURS,
    },
  },
};
