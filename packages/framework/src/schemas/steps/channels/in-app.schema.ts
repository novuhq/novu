import { Schema } from '../../../types/schema.types';

const avatarSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['user', 'system', 'custom'] },
  },
  oneOf: [
    {
      properties: {
        type: { const: 'user' },
        url: { type: 'string', format: 'uri' },
      },
      required: ['type', 'url'],
      additionalProperties: false,
    },
    {
      properties: {
        type: { const: 'custom' },
        url: { type: 'string', format: 'uri' },
      },
      required: ['type', 'url'],
      additionalProperties: false,
    },
    {
      properties: {
        type: { const: 'system' },
        icon: { type: 'string' },
      },
      required: ['type', 'icon'],
      additionalProperties: false,
    },
  ],
} as const satisfies Schema;

const actionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['label'],
  additionalProperties: false,
} as const satisfies Schema;

const actorSchema = {
  type: 'object',
  properties: {
    subscriberId: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    avatar: { type: 'string', format: 'uri' },
  },
  required: ['subscriberId'],
  additionalProperties: false,
} as const satisfies Schema;

const inAppOutputSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    actor: actorSchema,
    avatar: avatarSchema,
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
  },
  required: ['body'],
  additionalProperties: false,
} as const satisfies Schema;

const inAppResultSchema = {
  type: 'object',
  properties: {
    seen: { type: 'boolean' },
    read: { type: 'boolean' },
    lastSeenDate: { type: 'string', format: 'date-time', nullable: true },
    lastReadDate: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['seen', 'read', 'lastSeenDate', 'lastReadDate'],
  additionalProperties: false,
} as const satisfies Schema;

export const inAppChannelSchemas = {
  output: inAppOutputSchema,
  result: inAppResultSchema,
};
