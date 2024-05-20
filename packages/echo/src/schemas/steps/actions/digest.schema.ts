import { Schema } from '../../../types/schema.types';

export const digestOutputSchema = {
  type: 'object',
  properties: {
    amount: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    },
  },
  required: ['amount', 'unit'],
  additionalProperties: false,
} as const satisfies Schema;

export const digestResultSchema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          time: { type: 'string' },
          payload: { type: 'object' },
        },
        required: ['id', 'time', 'payload'],
        additionalProperties: false,
      },
    },
  },
  required: ['events'],
  additionalProperties: false,
} as const satisfies Schema;
