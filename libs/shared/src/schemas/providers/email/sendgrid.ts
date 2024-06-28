import { Schema } from '../../../types/framework';

/**
 * Sendgrid payload schema
 *
 * @see https://api.slack.com/reference/messaging/payload
 */
export const sendgridOutputSchema = {
  type: 'object',
  properties: {
    ipPoolName: { type: 'string' },
  },
  required: ['ipPoolName'],
  additionalProperties: false,
} as const satisfies Schema;

export const sendgridProviderSchemas = {
  output: sendgridOutputSchema,
};
