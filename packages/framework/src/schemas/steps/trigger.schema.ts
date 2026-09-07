import type { JsonSchema } from '../../types/schema.types';

export const triggerSchema = {
  type: 'object',
  properties: {
    to: { type: 'string', pattern: '/[0-9a-f]+/' },
    body: { type: 'string' },
  },
  required: ['to', 'body'],
  additionalProperties: false,
} as const satisfies JsonSchema;
