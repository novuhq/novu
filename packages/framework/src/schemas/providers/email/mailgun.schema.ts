import { Schema } from '../../../types/schema.types';

export const mailgunOutputSchema = {
  type: 'object',
  properties: {
    to: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    from: { type: 'string' },
    subject: { type: 'string' },
    text: { type: 'string' },
    html: { type: 'string' },
    message: { type: 'string' },
    cc: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    bcc: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    'amp-html': { type: 'string' },
    't:version': { type: 'string' },
    't:text': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:tag': {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    },
    'o:dkim': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:deliverytime': { type: 'string' },
    'o:deliverytime-optimize-period': { type: 'string' },
    'o:time-zone-localize': { type: 'string' },
    'o:testmode': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:tracking': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:tracking-clicks': {
      anyOf: [{ type: 'string', enum: ['yes', 'no', 'htmlonly'] }, { type: 'boolean' }],
    },
    'o:tracking-opens': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:require-tls': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'o:skip-verification': {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    'recipient-variables': { type: 'string' },
    'h:X-My-Header': { type: 'string' },
    'v:my-var': { type: 'string' },
  },
  additionalProperties: true,
} as const satisfies Schema;

export const mailgunProviderSchemas = {
  output: mailgunOutputSchema,
};
