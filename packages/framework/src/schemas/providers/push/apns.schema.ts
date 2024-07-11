import { Schema } from '../../../types/schema.types';

const sound = {
  anyOf: [
    { type: 'string' },
    {
      type: 'object',
      additionalProperties: true,
      properties: { name: { type: 'string' }, volume: { type: 'number' }, critical: { type: 'number' } },
      required: ['name', 'volume', 'critical'],
    },
  ],
} satisfies Schema;

export const apnsOutputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string' },
    id: { type: 'string' },
    expiry: { type: 'number' },
    priority: { type: 'number' },
    collapseId: { type: 'string' },
    pushType: { type: 'string', enum: ['background', 'alert', 'voip'] },
    threadId: { type: 'string' },
    payload: { type: 'object', additionalProperties: true },
    aps: {
      type: 'object',
      additionalProperties: true,
      properties: {
        badge: { type: 'number' },
        sound,
        category: { type: 'string' },
        'content-available': { type: 'number' },
        'launch-image': { type: 'number' },
        'mutable-content': { type: 'number' },
        'url-args': { type: 'array', items: { type: 'string' } },
      },
    },
    rawPayload: { type: 'object', additionalProperties: true },
    badge: { type: 'number' },
    sound,
    alert: {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          additionalProperties: true,
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            subtitle: { type: 'string' },
            'title-loc-key': { type: 'string' },
            'title-loc-args': { type: 'array', items: { type: 'string' } },
            'action-loc-key': { type: 'string' },
            'loc-key': { type: 'string' },
            'loc-args': { type: 'array', items: { type: 'string' } },
            'launch-image': { type: 'string' },
          },
          required: ['body'],
        },
      ],
    },
    contentAvailable: { type: 'boolean' },
    mutableContent: { type: 'boolean' },
    mdm: {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          additionalProperties: true,
        },
      ],
    },
    urlArgs: { type: 'array', items: { type: 'string' } },
  },
  required: ['topic'],
  additionalProperties: true,
} as const satisfies Schema;

export const apnsProviderSchemas = {
  output: apnsOutputSchema,
};
