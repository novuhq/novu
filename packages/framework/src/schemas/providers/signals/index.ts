import { SignalsProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';

export const signalsProviderSchemas = {
  github: genericProviderSchemas,
  'signals-webhook': genericProviderSchemas,
} as const satisfies Record<SignalsProviderIdEnum, { output: JsonSchema }>;
