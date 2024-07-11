import { Schema } from '../../../types/schema.types';

const address = {
  type: 'object',
  properties: {
    Name: { type: 'string' },
    Email: { type: 'string' },
  },
  required: ['Email'],
  additionalProperties: true,
} satisfies Schema;

const attatchment = {
  type: 'object',
  properties: {
    ContentType: { type: 'string' },
    Filename: { type: 'string' },
    Base64Content: { type: 'string' },
  },
  required: ['ContentType', 'Filename', 'Base64Content'],
  additionalProperties: true,
} satisfies Schema;

const inlineAttatchment = {
  type: 'object',
  properties: {
    Filename: { type: 'string' },
    ContentType: { type: 'string' },
    ContentID: { type: 'string' },
    Base64Content: { type: 'string' },
  },
  required: ['ContentType', 'Filename', 'Base64Content'],
  additionalProperties: true,
} satisfies Schema;

export const mailjetOutputSchema = {
  type: 'object',
  properties: {
    From: address,
    Sender: address,
    To: {
      type: 'array',
      items: address,
    },
    Cc: {
      type: 'array',
      items: address,
    },
    Bcc: {
      type: 'array',
      items: address,
    },
    ReplyTo: address,
    Subject: { type: 'string' },
    TextPart: { type: 'string' },
    HTMLPart: { type: 'string' },
    TemplateID: { type: 'number' },
    TemplateLanguage: { type: 'boolean' },
    TemplateErrorReporting: address,
    TemplateErrorDeliver: { type: 'boolean' },
    Attachments: {
      type: 'array',
      items: attatchment,
    },
    InlineAttachments: {
      type: 'array',
      items: inlineAttatchment,
    },
    Priority: { type: 'number' },
    CustomCampaign: { type: 'string' },
    DeduplicateCampaign: { type: 'boolean' },
    TrackOpens: {
      type: 'string',
      enum: ['account_default', 'disabled', 'enabled'],
    },
    TrackClicks: {
      type: 'string',
      enum: ['account_default', 'disabled', 'enabled'],
    },
    CustomID: { type: 'string' },
    EventPayload: { type: 'string' },
    URLTags: { type: 'string' },
    Headers: { type: 'object', additionalProperties: true },
    Variables: { type: 'object', additionalProperties: true },
  },
  required: ['From', 'To'],
  additionalProperties: true,
} as const satisfies Schema;

export const mailjetProviderSchemas = {
  output: mailjetOutputSchema,
};
