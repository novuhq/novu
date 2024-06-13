import { Schema } from '../../../types/schema.types';

const regularDelayOutputSchema = {
  type: 'object',
  properties: {
    type: {
      enum: ['regular'],
    },
    amount: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    },
  },
  required: ['amount', 'unit', 'type'],
  additionalProperties: false,
} as const satisfies Schema;

const scheduledDelayOutputSchema = {
  type: 'object',
  properties: {
    type: {
      enum: ['scheduled'],
    },
    date: { type: 'string', format: 'date-time' },
  },
  required: ['date', 'type'],
  additionalProperties: false,
} as const satisfies Schema;

export const delayOutputSchema = {
  oneOf: [regularDelayOutputSchema, scheduledDelayOutputSchema],
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
