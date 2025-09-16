import type { JsonSchema } from '../../../types/schema.types';

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
    extendToSchedule: { type: 'boolean' },
  },
  required: ['amount', 'unit'],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const delayResultSchema = {
  type: 'object',
  properties: {
    duration: { type: 'number' },
  },
  required: ['duration'],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const delayActionSchemas = {
  output: delayOutputSchema,
  result: delayResultSchema,
};
