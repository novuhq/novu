import type { JsonSchema } from '../../../types/schema.types';

const address = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string' },
  },
  description: `JSON object, containing 2 properties: Name and Email address of a previously validated and active sender. Including the Name property in the JSON is optional. This property is not mandatory in case you use TemplateID and you specified a From address for the template. Format : { "Email":"value", "Name":"value" }.`,
  required: ['Email'],
  additionalProperties: true,
} satisfies JsonSchema;

const attachment = {
  type: 'object',
  properties: {
    contentType: { type: 'string' },
    filename: { type: 'string' },
    base64Content: { type: 'string' },
  },
  required: ['ContentType', 'Filename', 'Base64Content'],
  additionalProperties: true,
} satisfies JsonSchema;

const inlineAttatchment = {
  type: 'object',
  properties: {
    filename: { type: 'string' },
    contentType: { type: 'string' },
    contentId: { type: 'string' },
    base64Content: { type: 'string' },
  },
  required: ['ContentType', 'Filename', 'Base64Content'],
  additionalProperties: true,
} satisfies JsonSchema;

/**
 * Mailjet `POST /send` schema
 *
 * @see https://dev.mailjet.com/email/reference/send-emails
 */
const mailjetOutputSchema = {
  type: 'object',
  properties: {
    from: address,
    sender: address,
    to: {
      type: 'array',
      items: address,
    },
    cc: {
      type: 'array',
      items: address,
    },
    bcc: {
      type: 'array',
      items: address,
    },
    replyTo: address,
    subject: { type: 'string' },
    textPart: {
      type: 'string',
      description: `Content of the message, sent in Text and/or HTML format. At least one of these content types needs to be specified. When the HTML part is the only part provided, Mailjet will not generate a Text-part from the HTML version. The property can't be set when you use TemplateID`,
    },
    htmlPart: {
      type: 'string',
      description: `Content of the message, sent in Text and/or HTML format. At least one of these content types needs to be specified. When the HTML part is the only part provided, Mailjet will not generate a Text-part from the HTML version. The property can't be set when you use TemplateID`,
    },
    templateId: {
      type: 'number',
      description: `an ID for a template that is previously created and stored in Mailjet's system. It is mandatory when From and TextPart and/or HtmlPart are not provided. `,
    },
    templateLanguage: { type: 'boolean' },
    templateErrorReporting: address,
    templateErrorDeliver: { type: 'boolean' },
    attachments: {
      type: 'array',
      items: attachment,
    },
    inlineAttachments: {
      type: 'array',
      items: inlineAttatchment,
    },
    priority: { type: 'number' },
    customCampaign: { type: 'string' },
    deduplicateCampaign: { type: 'boolean' },
    trackOpens: {
      type: 'string',
      enum: ['account_default', 'disabled', 'enabled'],
    },
    trackClicks: {
      type: 'string',
      enum: ['account_default', 'disabled', 'enabled'],
    },
    customId: { type: 'string' },
    eventPayload: { type: 'string' },
    urlTags: { type: 'string' },
    headers: { type: 'object', additionalProperties: true },
    variables: { type: 'object', additionalProperties: true },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const mailjetProviderSchemas = {
  output: mailjetOutputSchema,
};
