import type { JsonSchema } from '../../../types/schema.types';

const emailOutputSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['subject', 'body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const emailResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const emailChannelSchemas = {
  output: emailOutputSchema,
  result: emailResultSchema,
};
