import { Schema } from '../../../types/schema.types';

/**
 * Novu sms schema
 */
const novuSmsOutputSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const novuSmsProviderSchemas = {
  output: novuSmsOutputSchema,
};
