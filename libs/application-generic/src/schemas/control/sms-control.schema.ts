import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { skipStepUiSchema, skipZodSchema, toControlJsonSchema } from './shared';

export const smsControlZodSchema = z
  .object({
    skip: skipZodSchema,
    body: z.string(),
  })
  .strict();

export type SmsControlType = z.infer<typeof smsControlZodSchema>;

export const smsControlSchema = toControlJsonSchema(smsControlZodSchema);
export const smsUiSchema: UiSchema = {
  group: UiSchemaGroupEnum.SMS,
  properties: {
    body: {
      component: UiComponentEnum.SMS_BODY,
    },
    skip: skipStepUiSchema.properties.skip,
  },
};
