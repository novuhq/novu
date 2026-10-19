import { JsonSchema } from '../../../types/schema.types';

const smsOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const smsResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const smsChannelSchemas = {
  output: smsOutputSchema,
  result: smsResultSchema,
};
