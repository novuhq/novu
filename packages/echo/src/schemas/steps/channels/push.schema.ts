import { Schema } from '../../../types/schema.types';

const pushOutputSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['subject', 'body'],
  additionalProperties: false,
} as const satisfies Schema;

const pushResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const pushChannelSchemas = {
  output: pushOutputSchema,
  result: pushResultSchema,
};
