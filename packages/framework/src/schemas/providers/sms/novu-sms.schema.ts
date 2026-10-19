import type { JsonSchema } from '../../../types/schema.types';

/**
 * Novu sms schema
 */
const novuSmsOutputSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const novuSmsProviderSchemas = {
  output: novuSmsOutputSchema,
};
