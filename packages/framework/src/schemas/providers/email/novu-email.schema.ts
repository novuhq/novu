import { Schema } from '../../../types/schema.types';

/**
 * Novu email schema
 */
const novuEmailOutputSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const novuEmailProviderSchemas = {
  output: novuEmailOutputSchema,
};
