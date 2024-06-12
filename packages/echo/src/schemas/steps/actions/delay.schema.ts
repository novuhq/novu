import { Schema } from '../../../types/schema.types';

export const delayOutputSchema = {
  type: 'object',
  properties: {
    type: {
      enum: ['regular'],
      default: 'regular',
    },
    amount: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    },
  },
  required: ['amount', 'unit'],
  additionalProperties: false,
} as const satisfies Schema;

export const delayResultSchema = {
  type: 'object',
  properties: {
    duration: { type: 'number' },
  },
  required: ['duration'],
  additionalProperties: false,
} as const satisfies Schema;

export const delayChannelSchemas = {
  output: delayOutputSchema,
  result: delayResultSchema,
};
