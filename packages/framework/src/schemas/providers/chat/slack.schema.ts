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
          // Open string — Slack adds block types over time; shared override schemas own deep shape.
          type: {
            type: 'string',
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
