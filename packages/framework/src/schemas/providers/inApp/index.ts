import { InAppProviderIdEnum } from '@novu/shared';
import { Schema } from '../../../types';
import { novuInAppProviderSchemas } from './novu-inapp.schema';

export const inAppProviderSchemas = {
  [InAppProviderIdEnum.Novu]: novuInAppProviderSchemas,
} satisfies Record<InAppProviderIdEnum, { output: Schema }>;
