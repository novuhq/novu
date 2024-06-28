import { Schema } from '../../../types/framework';

const emailOutputSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['subject', 'body'],
  additionalProperties: false,
} as const satisfies Schema;

const emailResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const emailChannelSchemas = {
  output: emailOutputSchema,
  result: emailResultSchema,
};
