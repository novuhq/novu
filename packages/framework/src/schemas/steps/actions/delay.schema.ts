import type { JsonSchema } from '../../../types/schema.types';

export const delayRegularOutputSchema = {
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
    extendToSchedule: { type: 'boolean' },
  },
  required: ['amount', 'unit'],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const delayTimedOutputSchema = {
  type: 'object',
  properties: {
    type: {
      enum: ['timed'],
    },
    cron: { type: 'string' },
    extendToSchedule: { type: 'boolean' },
  },
  required: ['cron'],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const delayDynamicOutputSchema = {
  type: 'object',
  properties: {
    type: {
      enum: ['dynamic'],
    },
    dynamicKey: { type: 'string' },
    extendToSchedule: { type: 'boolean' },
  },
  required: ['dynamicKey'],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const delayOutputSchema = {
  oneOf: [delayRegularOutputSchema, delayTimedOutputSchema, delayDynamicOutputSchema],
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
