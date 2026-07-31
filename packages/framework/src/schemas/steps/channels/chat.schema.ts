import type { JsonSchema } from '../../../types/schema.types';

/**
 * The card-child variants below intentionally omit `additionalProperties: false`.
 * The framework's Ajv instance runs with `removeAdditional: 'failing'`, which — combined with an
 * `anyOf` of strict object schemas — mutates the data while probing sibling branches: e.g. when an
 * `actions` element is tested against the `text`/`image`/`divider` variants, Ajv strips its
 * `children` (an "additional" property for those variants), so the `actions` branch then fails with
 * "must have required property 'children'" even though the element was valid. `type` const + the
 * `required` fields already discriminate the union, and the card is validated strictly server-side
 * (`cardElementZodSchema`) before it reaches the bridge, so dropping the per-variant strictness here
 * is safe and avoids the corruption.
 */
const cardElementTextSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'text' },
    content: { type: 'string' },
    style: { type: 'string', enum: ['plain', 'bold', 'muted'] },
  },
  required: ['type', 'content'],
} as const satisfies JsonSchema;

const cardElementImageSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'image' },
    url: { type: 'string' },
    alt: { type: 'string' },
  },
  required: ['type', 'url'],
} as const satisfies JsonSchema;

const cardElementDividerSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'divider' },
  },
  required: ['type'],
} as const satisfies JsonSchema;

const cardElementLinkButtonSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'link-button' },
    label: { type: 'string' },
    url: { type: 'string' },
    style: { type: 'string', enum: ['primary', 'danger', 'default'] },
    id: { type: 'string' },
  },
  required: ['type', 'label', 'url'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const cardElementActionsSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'actions' },
    children: { type: 'array', items: cardElementLinkButtonSchema },
  },
  required: ['type', 'children'],
} as const satisfies JsonSchema;

const cardElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'card' },
    title: { type: 'string' },
    subtitle: { type: 'string' },
    imageUrl: { type: 'string' },
    children: {
      type: 'array',
      items: {
        anyOf: [cardElementTextSchema, cardElementImageSchema, cardElementDividerSchema, cardElementActionsSchema],
      },
    },
  },
  required: ['type', 'children'],
  additionalProperties: false,
} as const satisfies JsonSchema;

const chatOutputSchema = {
  type: 'object',
  properties: {
    body: { type: 'string' },
    card: cardElementSchema,
  },
  anyOf: [{ required: ['body'] }, { required: ['card'] }],
  additionalProperties: false,
} as const satisfies JsonSchema;

const chatResultSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JsonSchema;

export const chatChannelSchemas = {
  output: chatOutputSchema,
  result: chatResultSchema,
};
