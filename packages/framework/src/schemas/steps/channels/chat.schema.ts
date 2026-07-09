import type { JsonSchema } from '../../../types/schema.types';

const chatOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
    card: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['card'] },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        imageUrl: { type: 'string' },
        children: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
            },
            required: ['type'],
            additionalProperties: true,
          },
        },
      },
      required: ['type', 'children'],
      additionalProperties: false,
    },
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const chatResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const chatChannelSchemas = {
  output: chatOutputSchema,
  result: chatResultSchema,
};
