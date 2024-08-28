import { Schema } from '../../../types/schema.types';

const redirectSchema = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    target: { enum: ['_self', '_blank', '_parent', '_top', '_unfencedTop'] },
  },
  required: ['url'],
  additionalProperties: false,
} as const satisfies Schema;

const actionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    redirect: redirectSchema,
  },
  required: ['label'],
  additionalProperties: false,
} as const satisfies Schema;

const inAppOutputSchema = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    avatar: { type: 'string', format: 'uri' },
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
    data: { type: 'object', additionalProperties: true },
    redirect: redirectSchema,
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
