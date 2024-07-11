import { InAppProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types';

export const inAppProviderSchemas = {
  [InAppProviderIdEnum.Novu]: {
    output: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    } as const satisfies Schema,
  },
} satisfies Record<InAppProviderIdEnum, { output: Schema }>;
