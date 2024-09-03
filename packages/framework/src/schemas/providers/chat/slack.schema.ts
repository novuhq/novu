import { Schema } from '../../../types/schema.types';

/**
 * Slack message payload schema
 *
 * @see https://api.slack.com/reference/messaging/payload
 */
const slackOutputSchema = {
  type: 'object',
  properties: {
    webhookUrl: {
      type: 'string',
      format: 'uri',
    },
    text: {
      type: 'string',
    },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            enum: [
              'image',
              'context',
              'actions',
              'divider',
              'section',
              'input',
              'file',
              'header',
              'video',
              'rich_text',
            ],
          },
        },
        required: ['type'],
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
} as const satisfies Schema;

export const slackProviderSchemas = {
  output: slackOutputSchema,
};
