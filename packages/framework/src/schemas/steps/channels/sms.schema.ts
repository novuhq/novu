import { Schema } from '../../../types/schema.types';

const smsOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies Schema;

const smsResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies Schema;

export const smsChannelSchemas = {
  output: smsOutputSchema,
  result: smsResultSchema,
};
