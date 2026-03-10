import type { JsonSchema } from '../../../types/schema.types';

/**
 * ClickUp message payload schema
 *
 * @see https://developer.clickup.com/reference/createchatmessage
 */
const clickupOutputSchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['message', 'post'],
      description: 'The type of the message',
    },
    content: {
      type: 'string',
      description: 'The message content to send',
    },
    content_format: {
      type: 'string',
      enum: ['text/md', 'text/plain'],
      description: 'The format of the message content',
    }
  },
  required: ['content'],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const clickupProviderSchemas = {
  output: clickupOutputSchema,
};
