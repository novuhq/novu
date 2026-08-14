import type { JsonSchema } from '../../../types/schema.types';

export const waitOutputSchema = {
  type: 'object',
  properties: {
    amount: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['seconds', 'minutes', 'hours', 'days', 'weeks'],
    },
    expiresIn: { type: 'string' },
  },
  additionalProperties: false,
} as const satisfies JsonSchema;

export const waitResultSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['resumed', 'expired'],
    },
    data: {
      type: 'object',
      additionalProperties: true,
    },
  },
  required: ['status'],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const waitActionSchemas = {
  output: waitOutputSchema,
  result: waitResultSchema,
};
