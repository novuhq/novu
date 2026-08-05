import type { JsonSchema } from '../../../types/schema.types';

const toolOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const toolResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const toolChannelSchemas = {
  output: toolOutputSchema,
  result: toolResultSchema,
};
