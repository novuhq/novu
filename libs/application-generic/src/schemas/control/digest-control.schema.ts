import { JSONSchemaEntity } from '@novu/dal';
import {
  DigestTypeEnum,
  DigestUnitEnum,
  TimeUnitEnum,
  UiComponentEnum,
  UiSchema,
  UiSchemaGroupEnum,
} from '@novu/shared';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { defaultOptions, skipStepUiSchema, skipZodSchema } from './shared';

const lookBackWindowZodSchema = z
  .object({
    amount: z.number().min(1),
    unit: z.nativeEnum(TimeUnitEnum),
    extendToSchedule: z.boolean().optional(),
  })
  .strict();

const digestRegularControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z.enum([DigestTypeEnum.REGULAR]).optional(),
    amount: z.number().min(1),
    unit: z.nativeEnum(TimeUnitEnum),
    digestKey: z.string().optional(),
    lookBackWindow: lookBackWindowZodSchema.optional(),
    extendToSchedule: z.boolean().optional(),
  })
  .strict();

const digestTimedControlZodSchema = z
  .object({
    skip: skipZodSchema,
    type: z.enum([DigestTypeEnum.TIMED]).optional(),
    cron: z.string().min(1),
    digestKey: z.string().optional(),
    extendToSchedule: z.boolean().optional(),
  })
  .strict();

export type LookBackWindowType = z.infer<typeof lookBackWindowZodSchema>;
export type DigestRegularControlType = z.infer<typeof digestRegularControlZodSchema>;
export type DigestTimedControlType = z.infer<typeof digestTimedControlZodSchema>;
export type DigestControlSchemaType = z.infer<typeof digestControlZodSchema>;

export const digestControlZodSchema = z.union([digestRegularControlZodSchema, digestTimedControlZodSchema]);
export const digestControlSchema = zodToJsonSchema(digestControlZodSchema, defaultOptions) as JSONSchemaEntity;

export function isDigestRegularControl(data: unknown): data is DigestRegularControlType {
  const result = digestRegularControlZodSchema.safeParse(data);

  return result.success;
}

export function isDigestTimedControl(data: unknown): data is DigestTimedControlType {
  const result = digestTimedControlZodSchema.safeParse(data);

  return result.success;
}

export function isDigestControl(data: unknown): data is DigestControlSchemaType {
  const result = digestControlZodSchema.safeParse(data);

  return result.success;
}

export const digestUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.DIGEST,
  properties: {
    amount: {
      component: UiComponentEnum.DIGEST_AMOUNT,
      placeholder: '',
    },
    unit: {
      component: UiComponentEnum.DIGEST_UNIT,
      placeholder: DigestUnitEnum.SECONDS,
    },
    digestKey: {
      component: UiComponentEnum.DIGEST_KEY,
      placeholder: '',
    },
    cron: {
      component: UiComponentEnum.DIGEST_CRON,
      placeholder: '',
    },
    type: {
      component: UiComponentEnum.DIGEST_TYPE,
      placeholder: 'regular',
    },
    extendToSchedule: {
      component: UiComponentEnum.EXTEND_TO_SCHEDULE,
      placeholder: false,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
