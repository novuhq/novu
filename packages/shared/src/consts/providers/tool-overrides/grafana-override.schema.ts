import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';

/**
 * Grafana IRM/OnCall Formatted Webhook fields.
 * Docs: https://grafana.com/docs/grafana-cloud/alerting-and-irm/irm/integrations/custom-integrations/incoming-webhooks/oncall-webhooks/
 */
export const grafanaOverrideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: {
      type: 'string',
      description: 'Alert details. Falls back to the default message content when omitted.',
    },
    title: {
      type: 'string',
      maxLength: 1024,
      description: 'Title of the alert group. Falls back to the message content when omitted.',
    },
    alert_uid: {
      type: 'string',
      maxLength: 255,
      description: 'Unique alert ID used for grouping and auto-resolution.',
    },
    state: {
      type: 'string',
      enum: ['alerting', 'ok'],
      description: 'Alert state. Send "ok" with the same alert_uid to auto-resolve.',
    },
    link_to_upstream_details: {
      type: 'string',
      description: 'Link back to your monitoring system.',
    },
    image_url: {
      type: 'string',
      description: 'URL of an image attached to the alert.',
    },
  },
} as const satisfies JSONSchemaDto;
