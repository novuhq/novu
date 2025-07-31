import { UiComponentEnum, UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { z } from 'zod';
import { Options, Targets } from 'zod-to-json-schema';

export const defaultOptions: Partial<Options<Targets>> = {
  $refStrategy: 'none',
};

export const skipZodSchema = z.object({}).catchall(z.unknown()).optional();

export const skipStepUiSchema = {
  group: UiSchemaGroupEnum.SKIP,
  properties: {
    skip: {
      component: UiComponentEnum.QUERY_EDITOR,
    },
  },
} satisfies UiSchema;
