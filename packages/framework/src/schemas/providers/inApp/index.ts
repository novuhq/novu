import { InAppProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { novuInAppProviderSchemas } from './novu-inapp.schema';

export const inAppProviderSchemas = {
  novu: novuInAppProviderSchemas,
} as const satisfies Record<InAppProviderIdEnum, { output: JsonSchema }>;
