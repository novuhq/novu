import type { JsonSchema } from '../../../types/schema.types';

const signalsOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const signalsResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const signalsChannelSchemas = {
  output: signalsOutputSchema,
  result: signalsResultSchema,
};
