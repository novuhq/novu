import { ToolProviderIdEnum } from '../../../shared';
import type { JsonSchema } from '../../../types/schema.types';
import { genericProviderSchemas } from '../generic.schema';

export const toolProviderSchemas = {
  pagerduty: genericProviderSchemas,
  opsgenie: genericProviderSchemas,
  'tool-webhook': genericProviderSchemas,
} as const satisfies Record<ToolProviderIdEnum, { output: JsonSchema }>;
