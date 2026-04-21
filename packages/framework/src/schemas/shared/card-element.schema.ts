import type { JsonSchema } from '../../types/schema.types';

/**
 * JSON schema mirror of the `chat` package's `CardElement` tree.
 *
 * Uses `additionalProperties: true` on inner element shapes so unsupported
 * future element types (added upstream in `chat`) don't break validation —
 * we accept and pass them through to the compiler, which will gracefully
 * fall back to text for anything it doesn't recognize.
 *
 * Source of truth for the TS types is `packages/framework/src/resources/agent/agent.types.ts`
 * (re-exports from `chat`). This JSON schema stays loose on purpose.
 */

const textElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['text'] },
    content: { type: 'string' },
    style: { type: 'string', enum: ['plain', 'bold', 'muted'] },
  },
  required: ['type', 'content'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const imageElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['image'] },
    url: { type: 'string' },
    alt: { type: 'string' },
  },
  required: ['type', 'url'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const dividerElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['divider'] },
  },
  required: ['type'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const linkElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['link'] },
    label: { type: 'string' },
    url: { type: 'string' },
  },
  required: ['type', 'label', 'url'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const buttonElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['button'] },
    id: { type: 'string' },
    label: { type: 'string' },
    style: { type: 'string', enum: ['primary', 'danger', 'default'] },
    actionType: { type: 'string', enum: ['action', 'modal'] },
    value: { type: 'string' },
    disabled: { type: 'boolean' },
  },
  required: ['type', 'id', 'label'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const linkButtonElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['link-button'] },
    label: { type: 'string' },
    url: { type: 'string' },
    style: { type: 'string', enum: ['primary', 'danger', 'default'] },
  },
  required: ['type', 'label', 'url'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const selectOptionSchema = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    value: { type: 'string' },
    description: { type: 'string' },
  },
  required: ['label', 'value'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const selectElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['select'] },
    id: { type: 'string' },
    label: { type: 'string' },
    options: { type: 'array', items: selectOptionSchema },
    placeholder: { type: 'string' },
    initialOption: { type: 'string' },
    optional: { type: 'boolean' },
  },
  required: ['type', 'id', 'label', 'options'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const radioSelectElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['radio_select'] },
    id: { type: 'string' },
    label: { type: 'string' },
    options: { type: 'array', items: selectOptionSchema },
    initialOption: { type: 'string' },
    optional: { type: 'boolean' },
  },
  required: ['type', 'id', 'label', 'options'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const actionsElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['actions'] },
    children: {
      type: 'array',
      items: {
        oneOf: [buttonElementSchema, linkButtonElementSchema, selectElementSchema, radioSelectElementSchema],
      },
    },
  },
  required: ['type', 'children'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const fieldElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['field'] },
    label: { type: 'string' },
    value: { type: 'string' },
  },
  required: ['type', 'label', 'value'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const fieldsElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['fields'] },
    children: { type: 'array', items: fieldElementSchema },
  },
  required: ['type', 'children'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const tableElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['table'] },
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
  additionalProperties: true,
} as const satisfies JsonSchema;

// Section contains the full CardChild union (recursive). We keep it loose
// to avoid blowing up the compiled schema size; the runtime compiler does
// full validation via the `chat` package.
const sectionElementSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['section'] },
    children: { type: 'array' },
  },
  required: ['type', 'children'],
  additionalProperties: true,
} as const satisfies JsonSchema;

const cardChildSchema = {
  oneOf: [
    textElementSchema,
    imageElementSchema,
    dividerElementSchema,
    actionsElementSchema,
    sectionElementSchema,
    fieldsElementSchema,
    linkElementSchema,
    tableElementSchema,
  ],
} as const satisfies JsonSchema;

export const cardElementJsonSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['card'] },
    title: { type: 'string' },
    subtitle: { type: 'string' },
    imageUrl: { type: 'string' },
    children: {
      type: 'array',
      items: cardChildSchema,
    },
  },
  required: ['type', 'children'],
  additionalProperties: true,
} as const satisfies JsonSchema;
