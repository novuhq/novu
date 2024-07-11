import { Schema } from '../../../types/schema.types';

const address = {
  type: 'object',
  properties: {
    Name: { type: 'string' },
    Email: { type: 'string' },
  },
  description: `JSON object, containing 2 properties: Name and Email address of a previously validated and active sender. Including the Name property in the JSON is optional. This property is not mandatory in case you use TemplateID and you specified a From address for the template. Format : { "Email":"value", "Name":"value" }.`,
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
    TextPart: {
      type: 'string',
      description: `Content of the message, sent in Text and/or HTML format. At least one of these content types needs to be specified. When the HTML part is the only part provided, Mailjet will not generate a Text-part from the HTML version. The property can't be set when you use TemplateID`,
    },
    HTMLPart: {
      type: 'string',
      description: `Content of the message, sent in Text and/or HTML format. At least one of these content types needs to be specified. When the HTML part is the only part provided, Mailjet will not generate a Text-part from the HTML version. The property can't be set when you use TemplateID`,
    },
    TemplateID: {
      type: 'number',
      description: `an ID for a template that is previously created and stored in Mailjet's system. It is mandatory when From and TextPart and/or HtmlPart are not provided. `,
    },
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
