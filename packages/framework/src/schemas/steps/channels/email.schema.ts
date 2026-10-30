import type { JsonSchema } from '../../../types/schema.types';

const emailOutputSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string', minLength: 1 },
    body: { type: 'string' },
    from: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        name: { type: 'string' },
      },
      additionalProperties: false,
    },
    replyTo: { type: 'string' },
    preheader: { type: 'string' },
    useProviderDefaults: { type: 'boolean' },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          file: {
            description: 'Buffer or base64 string containing file data',
          },
          mime: { type: 'string' },
          cid: { type: 'string' },
          disposition: {
            type: 'string',
            enum: ['inline', 'attachment'],
          },
          channels: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['file', 'mime'],
        additionalProperties: false,
      },
    },
  },
  required: ['subject', 'body'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const emailResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const emailChannelSchemas = {
  output: emailOutputSchema,
  result: emailResultSchema,
};
