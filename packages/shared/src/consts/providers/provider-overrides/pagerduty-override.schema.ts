import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';

export const pagerdutyOverrideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      maxLength: 1024,
      description: 'Brief text summary of the event. Falls back to the default message content when omitted.',
    },
    severity: {
      type: 'string',
      enum: ['critical', 'error', 'warning', 'info'],
      description: 'Perceived severity of the event.',
    },
    source: {
      type: 'string',
      description: 'Unique location of the affected system (hostname or FQDN).',
    },
    timestamp: {
      type: 'string',
      description: 'ISO 8601 timestamp when the event occurred.',
    },
    component: {
      type: 'string',
      description: 'Component of the source machine that is responsible for the event.',
    },
    group: {
      type: 'string',
      description: 'Logical grouping of components of a service.',
    },
    class: {
      type: 'string',
      description: 'The class/type of the event.',
    },
    custom_details: {
      type: 'object',
      additionalProperties: true,
      description: 'Additional details about the event and affected system.',
    },
    dedup_key: {
      type: 'string',
      maxLength: 255,
      description: 'Deduplication key for correlating triggers and resolves.',
    },
    event_action: {
      type: 'string',
      enum: ['trigger', 'acknowledge', 'resolve'],
      description: 'The type of event.',
    },
    client: {
      type: 'string',
      description: 'Name of the monitoring client that is triggering this event.',
    },
    client_url: {
      type: 'string',
      description: 'URL of the monitoring client that is triggering this event.',
    },
    links: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['href'],
        properties: {
          href: { type: 'string' },
          text: { type: 'string' },
        },
      },
      description: 'List of links to include.',
    },
    images: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['src'],
        properties: {
          src: { type: 'string' },
          href: { type: 'string' },
          alt: { type: 'string' },
        },
      },
      description: 'List of images to include.',
    },
  },
} as const satisfies JSONSchemaDto;
