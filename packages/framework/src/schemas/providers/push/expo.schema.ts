import { Schema } from '../../../types/schema.types';

export const expoOutputSchema = {
  type: 'object',
  properties: {
    to: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    data: {
      type: 'object',
      additionalProperties: true,
    },
    title: { type: 'string' },
    subtitle: { type: 'string' },
    body: { type: 'string' },
    sound: {
      anyOf: [
        { type: 'string' },
        { type: 'null' },
        {
          type: 'object',
          properties: {
            name: { anyOf: [{ type: 'string', enum: ['default'] }, { type: 'null' }] },
            volume: { type: 'number' },
            critical: { type: 'boolean' },
          },
          additionalProperties: true,
        },
      ],
    },
    ttl: { type: 'number' },
    expiration: { type: 'number' },
    priority: { type: 'string', enum: ['default', 'normal', 'high'] },
    badge: { type: 'number' },
    channelId: { type: 'string' },
    categoryId: { type: 'string' },
    mutableContent: { type: 'boolean' },
  },
  required: ['to'],
  additionalProperties: true,
} as const satisfies Schema;

export const expoProviderSchemas = {
  output: expoOutputSchema,
};
