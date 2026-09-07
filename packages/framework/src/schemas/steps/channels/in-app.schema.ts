import type { JsonSchema } from '../../../types/schema.types';

const ABSOLUTE_AND_RELATIVE_URL_REGEX = '^(?!mailto:)(?:(https?):\\/\\/[^\\s/$.?#].[^\\s]*)|^(\\/[^\\s]*)$';

const redirectSchema = {
  type: 'object',
  properties: {
    url: {
      type: 'string',
      pattern: ABSOLUTE_AND_RELATIVE_URL_REGEX,
    },
    target: {
      type: 'string',
      enum: ['_self', '_blank', '_parent', '_top', '_unfencedTop'],
      default: '_blank',
    },
  },
  if: {
    properties: {
      url: {
        type: 'string',
        pattern: '^/', // Check if url starts with a slash (relative path)
      },
    },
  },
  then: {
    properties: {
      target: {
        default: '_self',
      },
    },
  },
  else: {
    properties: {
      target: {
        default: '_blank',
      },
    },
  },
  required: ['url'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const actionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    redirect: redirectSchema,
  },
  required: ['label'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const inAppOutputSchema = {
  type: 'object',
  properties: {
    subject: {
      type: 'string',
      minLength: 1,
    },
    body: {
      type: 'string',
      minLength: 1,
    },
    avatar: { type: 'string', format: 'uri' },
    primaryAction: actionSchema,
    secondaryAction: actionSchema,
    data: { type: 'object', additionalProperties: true },
    redirect: redirectSchema,
  },
  anyOf: [{ required: ['subject'] }, { required: ['body'] }],
  additionalProperties: false,
} as const satisfies JsonSchema;

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
} as const satisfies JsonSchema;

export const inAppChannelSchemas = {
  output: inAppOutputSchema,
  result: inAppResultSchema,
};
