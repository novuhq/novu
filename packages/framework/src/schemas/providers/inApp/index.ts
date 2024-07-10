import { InAppProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types';
import { genericProviderSchemas } from '../generic.schema';

export const inAppProviderSchemas = {
  [InAppProviderIdEnum.Novu]: genericProviderSchemas,
} satisfies Record<InAppProviderIdEnum, { output: Schema }>;
