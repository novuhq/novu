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
 *
 * Code-first `step.chat` accepts the Chat SDK card kit (section/fields/table + interactive
 * button/select/radio_select). The dashboard Maily compiler still emits the v1 subset only.
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

const cardElementLinkSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'link' },
    label: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['type', 'label', 'url'],
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
} as const satisfies JsonSchema;

const cardElementButtonSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'button' },
    id: { type: 'string' },
    label: { type: 'string' },
    style: { type: 'string', enum: ['primary', 'danger', 'default'] },
    actionType: { type: 'string', enum: ['action', 'modal'] },
    callbackUrl: { type: 'string' },
    value: { type: 'string' },
    disabled: { type: 'boolean' },
  },
  required: ['type', 'id', 'label'],
} as const satisfies JsonSchema;

const cardElementSelectOptionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['label', 'value'],
} as const satisfies JsonSchema;

const cardElementSelectSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'select' },
    id: { type: 'string' },
    label: { type: 'string' },
    options: { type: 'array', items: cardElementSelectOptionSchema },
    initialOption: { type: 'string' },
    optional: { type: 'boolean' },
    placeholder: { type: 'string' },
  },
  required: ['type', 'id', 'label', 'options'],
} as const satisfies JsonSchema;

const cardElementRadioSelectSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'radio_select' },
    id: { type: 'string' },
    label: { type: 'string' },
    options: { type: 'array', items: cardElementSelectOptionSchema },
    initialOption: { type: 'string' },
    optional: { type: 'boolean' },
  },
  required: ['type', 'id', 'label', 'options'],
} as const satisfies JsonSchema;

const cardElementActionsSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'actions' },
    children: {
      type: 'array',
      items: {
        anyOf: [
          cardElementLinkButtonSchema,
          cardElementButtonSchema,
          cardElementSelectSchema,
          cardElementRadioSelectSchema,
        ],
      },
    },
  },
  required: ['type', 'children'],
} as const satisfies JsonSchema;

const cardElementFieldSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'field' },
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['type', 'label', 'value'],
} as const satisfies JsonSchema;

const cardElementFieldsSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'fields' },
    children: { type: 'array', items: cardElementFieldSchema },
  },
  required: ['type', 'children'],
} as const satisfies JsonSchema;

const cardElementTableSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'table' },
    headers: { type: 'array', items: { type: 'string' } },
    rows: {
      type: 'array',
      items: { type: 'array', items: { type: 'string' } },
    },
    align: {
      type: 'array',
      items: { type: 'string', enum: ['left', 'center', 'right'] },
    },
  },
  required: ['type', 'headers', 'rows'],
} as const satisfies JsonSchema;

/**
 * Non-recursive card children. `section` may nest further sections; those deeper
 * levels are accepted as objects (TypeScript + Chat SDK builders enforce shape).
 */
const cardElementLeafChildSchemas = [
  cardElementTextSchema,
  cardElementImageSchema,
  cardElementDividerSchema,
  cardElementLinkSchema,
  cardElementActionsSchema,
  cardElementFieldsSchema,
  cardElementTableSchema,
] as const;

const cardElementSectionSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', const: 'section' },
    children: {
      type: 'array',
      items: {
        anyOf: [
          ...cardElementLeafChildSchemas,
          {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'section' },
              children: { type: 'array', items: { type: 'object' } },
            },
            required: ['type', 'children'],
          },
        ],
      },
    },
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
        anyOf: [...cardElementLeafChildSchemas, cardElementSectionSchema],
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
