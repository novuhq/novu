import type { JsonSchema } from '../../../types/schema.types';

export const delayOutputSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['regular', 'timed', 'dynamic'] },
    // Regular delay fields
    amount: { type: 'number' },
    unit: {
      type: 'string',
      enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
    },
    // Timed delay fields
    cron: { type: 'string' },
    // Dynamic delay fields
    dynamicKey: { type: 'string' },
    // Common fields
    extendToSchedule: { type: 'boolean' },
  },
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
