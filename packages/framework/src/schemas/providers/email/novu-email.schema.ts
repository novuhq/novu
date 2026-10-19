import type { JsonSchema } from '../../../types/schema.types';

/**
 * Novu email schema
 */
const novuEmailOutputSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const novuEmailProviderSchemas = {
  output: novuEmailOutputSchema,
};
