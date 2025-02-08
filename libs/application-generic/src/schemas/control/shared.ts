import { Targets, Options } from 'zod-to-json-schema';
import { UiSchemaGroupEnum, UiSchema, UiComponentEnum } from '@novu/shared';
import { z } from 'zod';

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
