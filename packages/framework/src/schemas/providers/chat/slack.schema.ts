import type { JsonSchema } from '../../../types/schema.types';

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
              'actions',
              'alert',
              'card',
              'carousel',
              'context',
              'context_actions',
              'divider',
              'file',
              'header',
              'image',
              'input',
              'markdown',
              'plan',
              'rich_text',
              'section',
              'table',
              'task_card',
              'video',
            ],
          },
        },
        required: ['type'],
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
} as const satisfies JsonSchema;

export const slackProviderSchemas = {
  output: slackOutputSchema,
};
