import type { JsonSchema } from '../../../types/schema.types';

/**
 * Novu in-app schema
 */
const novuInAppOutputSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const novuInAppProviderSchemas = {
  output: novuInAppOutputSchema,
};
