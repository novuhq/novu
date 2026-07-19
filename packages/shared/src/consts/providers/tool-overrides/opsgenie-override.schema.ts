import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';

export const opsgenieOverrideJsonSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    message: {
      type: 'string',
      maxLength: 130,
      description: 'Message of the alert. Falls back to the default message content when omitted.',
    },
    alias: {
      type: 'string',
      maxLength: 512,
      description: 'Client-defined identifier used for alert deduplication.',
    },
    description: {
      type: 'string',
      maxLength: 15000,
      description: 'Detailed description of the alert.',
    },
    priority: {
      type: 'string',
      enum: ['P1', 'P2', 'P3', 'P4', 'P5'],
      description: 'Priority level of the alert.',
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Tags of the alert.',
    },
    details: {
      type: 'object',
      additionalProperties: true,
      description: 'Map of key-value pairs used as custom properties.',
    },
    entity: {
      type: 'string',
      description: 'Domain entity the alert is related to.',
    },
    source: {
      type: 'string',
      maxLength: 100,
      description: 'Source field of the alert.',
    },
    user: {
      type: 'string',
      maxLength: 100,
      description: 'Display name of the request owner.',
    },
    note: {
      type: 'string',
      maxLength: 25000,
      description: 'Additional note added while creating the alert.',
    },
    responders: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          type: { type: 'string', enum: ['team', 'user', 'escalation', 'schedule'] },
          id: { type: 'string' },
          name: { type: 'string' },
          username: { type: 'string' },
        },
      },
      description: 'Responders the alert will be routed to.',
    },
    visibleTo: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
        properties: {
          type: { type: 'string', enum: ['team', 'user'] },
          id: { type: 'string' },
          name: { type: 'string' },
          username: { type: 'string' },
        },
      },
      description: 'Teams and users the alert will become visible to without notification.',
    },
    actions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Custom actions available for the alert.',
    },
  },
} as const satisfies JSONSchemaDto;
