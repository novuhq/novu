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

const DelayTypeEnumValues = {
  REGULAR: DelayTypeEnum.REGULAR,
  TIMED: DelayTypeEnum.TIMED,
  DYNAMIC: DelayTypeEnum.DYNAMIC,
} as const;

export const delayControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z
      .enum([DelayTypeEnumValues.REGULAR, DelayTypeEnumValues.TIMED, DelayTypeEnumValues.DYNAMIC])
      .default(DelayTypeEnumValues.REGULAR),
    // Regular delay fields
    amount: z.number().min(1).optional(),
    unit: z.nativeEnum(TimeUnitEnum).optional(),
    // Timed delay fields
    cron: z.string().min(1).optional(),
    // Dynamic delay fields
    dynamicKey: z.string().min(1).optional(),
    // Common fields
    extendToSchedule: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.type === DelayTypeEnumValues.REGULAR) {
        return data.amount !== undefined && data.unit !== undefined;
      }
      if (data.type === DelayTypeEnumValues.TIMED) {
        return data.cron !== undefined && data.cron.length > 0;
      }
      if (data.type === DelayTypeEnumValues.DYNAMIC) {
        return data.dynamicKey !== undefined && data.dynamicKey.length > 0;
      }
      return true;
    },
    {
      message:
        "Regular delay requires 'amount' and 'unit', timed delay requires 'cron', dynamic delay requires 'dynamicKey'",
    }
  );

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
    cron: {
      component: UiComponentEnum.DELAY_CRON,
      placeholder: '',
    },
    dynamicKey: {
      component: UiComponentEnum.DELAY_DYNAMIC_KEY,
      placeholder: 'payload.scheduledTime',
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
