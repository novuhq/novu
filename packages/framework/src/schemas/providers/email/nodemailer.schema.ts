import type { JsonSchema } from '../../../types/schema.types';

const address = {
  type: 'object',
  properties: {
    address: { type: 'string' },
    name: { type: 'string' },
  },
  additionalProperties: true,
} as const satisfies JsonSchema;

const attachmentLike = {
  type: 'object',
  properties: {
    content: { type: 'string' },
    path: { type: 'string' },
  },
  additionalProperties: true,
} as const satisfies JsonSchema;

/**
 * Nodemailer `sendMail` schema
 *
 * @see https://nodemailer.com/message/
 */
const nodemailerOutputSchema = {
  type: 'object',
  properties: {
    from: { anyOf: [{ type: 'string' }, address] },
    sender: { anyOf: [{ type: 'string' }, address] },
    to: { anyOf: [{ type: 'string' }, address, { type: 'array', items: address }] },
    cc: { anyOf: [{ type: 'string' }, address, { type: 'array', items: address }] },
    bcc: { anyOf: [{ type: 'string' }, address, { type: 'array', items: address }] },
    replyTo: { anyOf: [{ type: 'string' }, address, { type: 'array', items: address }] },
    inReplyTo: { anyOf: [{ type: 'string' }, address] },
    references: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    subject: { type: 'string' },
    text: { anyOf: [{ type: 'string' }, attachmentLike] },
    html: { anyOf: [{ type: 'string' }, attachmentLike] },
    watchHtml: { anyOf: [{ type: 'string' }, attachmentLike] },
    amp: {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            content: { type: 'string' },
            path: { type: 'string' },
            href: { type: 'string' },
            encoding: { type: 'string' },
            contentType: { type: 'string' },
            raw: { anyOf: [{ type: 'string' }, attachmentLike] },
          },
        },
      ],
    },
    icalEvent: {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          properties: {
            content: { type: 'string' },
            path: { type: 'string' },
            method: { type: 'string' },
            filename: { anyOf: [{ type: 'string' }, { type: 'boolean' }] },
            href: { type: 'string' },
            encoding: { type: 'string' },
          },
        },
      ],
    },
    headers: {
      anyOf: [
        { type: 'object', additionalProperties: true },
        {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
          },
        },
      ],
    },
    list: {
      anyOf: [
        { type: 'string' },
        {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      ],
    },
    attachments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          content: { type: 'string' },
          path: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const nodemailerProviderSchemas = {
  output: nodemailerOutputSchema,
};
