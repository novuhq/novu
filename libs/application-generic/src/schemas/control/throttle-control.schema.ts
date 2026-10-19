import { JSONSchemaEntity } from '@novu/dal';
import { TimeUnitEnum, UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

// Throttle-specific time units (excluding seconds for performance reasons)
const ThrottleTimeUnitEnum = {
  MINUTES: TimeUnitEnum.MINUTES,
  HOURS: TimeUnitEnum.HOURS,
  DAYS: TimeUnitEnum.DAYS,
} as const;

// Throttle type enum
const ThrottleTypeEnum = {
  FIXED: 'fixed',
  DYNAMIC: 'dynamic',
} as const;

// Base throttle schema with all possible fields
export const throttleControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z.enum([ThrottleTypeEnum.FIXED, ThrottleTypeEnum.DYNAMIC]).default(ThrottleTypeEnum.FIXED),
    // Fixed throttle fields
    amount: z.number().min(1).optional(),
    unit: z.nativeEnum(ThrottleTimeUnitEnum).optional(),
    // Dynamic throttle fields
    dynamicKey: z.string().min(1).optional(),
    // Common fields
    threshold: z.number().min(1).optional(),
    throttleKey: z.string().optional(),
  })
  .strict()
  .refine(
    (data) => {
      // If type is 'fixed', require amount and unit
      if (data.type === ThrottleTypeEnum.FIXED) {
        return data.amount !== undefined && data.unit !== undefined;
      }
      // If type is 'dynamic', require dynamicKey
      if (data.type === ThrottleTypeEnum.DYNAMIC) {
        return data.dynamicKey !== undefined && data.dynamicKey.length > 0;
      }
      return true;
    },
    {
      message: "Fixed throttle requires 'amount' and 'unit', dynamic throttle requires 'dynamicKey'",
    }
  );

export type ThrottleControlType = z.infer<typeof throttleControlZodSchema>;

export const throttleControlSchema = zodToJsonSchema(throttleControlZodSchema, defaultOptions) as JSONSchemaEntity;

export const throttleUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.THROTTLE,
  properties: {
    skip: skipStepUiSchema.properties.skip,
    type: {
      component: UiComponentEnum.THROTTLE_TYPE,
      placeholder: ThrottleTypeEnum.FIXED,
    },
    amount: {
      component: UiComponentEnum.THROTTLE_WINDOW,
      placeholder: null,
    },
    unit: {
      component: UiComponentEnum.THROTTLE_UNIT,
      placeholder: TimeUnitEnum.MINUTES,
    },
    dynamicKey: {
      component: UiComponentEnum.THROTTLE_DYNAMIC_KEY,
      placeholder: 'payload.timestamp',
    },
    threshold: {
      component: UiComponentEnum.THROTTLE_THRESHOLD,
      placeholder: 1,
    },
    throttleKey: {
      component: UiComponentEnum.THROTTLE_KEY,
      placeholder: '',
    },
  },
};
