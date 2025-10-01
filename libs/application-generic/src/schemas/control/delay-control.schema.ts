import { JSONSchemaEntity } from '@novu/dal';
import {
  DelayTypeEnum,
  DigestUnitEnum,
  TimeUnitEnum,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

export const delayRegularControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z.enum([DelayTypeEnum.REGULAR]).optional(),
    amount: z.number().min(1),
    unit: z.nativeEnum(TimeUnitEnum),
    extendToSchedule: z.boolean().optional(),
  })
  .strict();

const delayTimedControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z.enum([DelayTypeEnum.TIMED]).optional(),
    cron: z.string().min(1),
    extendToSchedule: z.boolean().optional(),
  })
  .strict();

export type DelayRegularControlType = z.infer<typeof delayRegularControlZodSchema>;
export type DelayTimedControlType = z.infer<typeof delayTimedControlZodSchema>;
export type DelayControlType = z.infer<typeof delayControlZodSchema>;

export const delayControlZodSchema = z.union([delayRegularControlZodSchema, delayTimedControlZodSchema]);
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
    cron: {
      component: UiComponentEnum.DELAY_CRON,
      placeholder: '',
    },
    type: {
      component: UiComponentEnum.DELAY_TYPE,
      placeholder: 'regular',
    },
    extendToSchedule: {
      component: UiComponentEnum.EXTEND_TO_SCHEDULE,
      placeholder: false,
    },
  },
};
