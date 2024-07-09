import { InAppProviderIdEnum } from '@novu/shared';
import { genericProviderSchemas } from '../generic';
import { InAppProvidersSchemas } from '../types';

export const inAppProviderSchemas: InAppProvidersSchemas = {
  [InAppProviderIdEnum.Novu]: genericProviderSchemas,
};
