import type { JsonSchema } from '../../../types/schema.types';

const chatOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const chatResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const chatChannelSchemas = {
  output: chatOutputSchema,
  result: chatResultSchema,
};
