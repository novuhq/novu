import type { JsonSchema } from '../../../types/schema.types';

export const throttleActionSchemas = {
  output: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['fixed', 'dynamic'] },
      // Fixed throttle fields
      amount: { type: 'number' },
      unit: { type: 'string', enum: ['minutes', 'hours', 'days'] },
      // Dynamic throttle fields
      dynamicKey: { type: 'string' },
      // Common fields
      threshold: { type: 'number' },
      throttleKey: { type: 'string' },
    },
    required: ['type'],
    additionalProperties: false,
  } as const satisfies JsonSchema,
  result: {
    type: 'object',
    properties: {
      throttled: {
        type: 'boolean',
        description: 'Whether the workflow execution was throttled',
      },
      executionCount: {
        type: 'number',
        description: 'Number of executions within the throttle window',
      },
      threshold: {
        type: 'number',
        description: 'The throttle threshold that was applied',
      },
      windowStart: {
        type: 'string',
        format: 'date-time',
        description: 'Start time of the throttle window',
      },
    },
    required: ['throttled'],
    additionalProperties: false,
  } as const satisfies JsonSchema,
};
