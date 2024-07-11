import { Schema } from '../../../types/schema.types';

export const mailgunOutputSchema = {
  type: 'object',
  properties: {
    to: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      description: `Email address of the recipient(s). Example: "Bob bob@host.com". You can use commas to separate multiple recipients (e.g.: "test@example.com,test@example.com" or ["test@example.com", "test@example.com"]).`,
    },
    from: { type: 'string' },
    subject: { type: 'string', description: `Subject of the message.` },
    text: { type: 'string', description: `Text version of the message.` },
    html: { type: 'string', description: `HTML version of the message.` },
    message: {
      type: 'string',
      description: `MIME string of the message. Make sure to use multipart/form-data to send this as a file upload.`,
    },
    cc: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      description: `Same as To but for carbon copy`,
    },
    bcc: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      description: `Same as To but for blind carbon copy`,
    },
    'amp-html': { type: 'string' },
    't:version': { type: 'string' },
    't:text': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:tag': {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      description: `Tag string. See Tagging for more information.`,
    },
    'o:dkim': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Enables/disabled DKIM signatures on per-message basis. Pass yes or no`,
    },
    'o:deliverytime': {
      type: 'string',
      description: `Desired time of delivery. See Date Format. Note: Messages can be scheduled for a maximum of 3 days in the future.`,
    },
    'o:deliverytime-optimize-period': { type: 'string' },
    'o:time-zone-localize': { type: 'string' },
    'o:testmode': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Enables sending in test mode. Pass yes if needed. See Sending in Test Mode`,
    },
    'o:tracking': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Toggles tracking on a per-message basis, see Tracking Messages for details. Pass yes or no.`,
    },
    'o:tracking-clicks': {
      anyOf: [{ type: 'string', enum: ['yes', 'no', 'htmlonly'] }, { type: 'boolean' }],
      description: `Toggles clicks tracking on a per-message basis. Has higher priority than domain-level setting. Pass yes, no or htmlonly.`,
    },
    'o:tracking-opens': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Toggles opens tracking on a per-message basis. Has higher priority than domain-level setting. Pass yes or no.`,
    },
    'o:require-tls': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:skip-verification': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'recipient-variables': { type: 'string' },
    'h:X-My-Header': {
      type: 'string',
      description: `h: prefix followed by an arbitrary value allows to append a custom MIME header to the message (X-My-Header in this case). For example, h:Reply-To to specify Reply-To address.`,
    },
    'v:my-var': {
      type: 'string',
      description: `v: prefix followed by an arbitrary name allows to attach a custom JSON data to the message. See Attaching Data to Messages for more information.`,
    },
  },
  additionalProperties: true,
} as const satisfies Schema;

export const mailgunProviderSchemas = {
  output: mailgunOutputSchema,
};
