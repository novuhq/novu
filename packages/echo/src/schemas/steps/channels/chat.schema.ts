import { Schema } from '../../../types/schema.types';

const chatOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies Schema;

const chatResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const chatChannelSchemas = {
  output: chatOutputSchema,
  result: chatResultSchema,
};
