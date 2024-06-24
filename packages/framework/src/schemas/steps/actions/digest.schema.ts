import { Schema } from '../../../types/schema.types';

export const digestRegularOutputSchema = {
  type: 'object',
  properties: {
    amount: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    },
    digestKey: {
      type: 'string',
    },
    lookBackWindow: {
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
    },
  },
  required: ['amount', 'unit'],
  additionalProperties: false,
} as const satisfies Schema;

export const digestTimedOutputSchema = {
  type: 'object',
  properties: {
    cron: { type: 'string' },
    digestKey: {
      type: 'string',
    },
  },
  required: ['cron'],
  additionalProperties: false,
} as const satisfies Schema;

export const digestOutputSchema = {
  oneOf: [digestRegularOutputSchema, digestTimedOutputSchema],
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

export const digestChannelSchemas = {
  output: digestOutputSchema,
  result: digestResultSchema,
};
