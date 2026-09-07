import type { JsonSchema } from '../../../types/schema.types';

/**
 * Mailgun `POST /messages` schema
 *
 * @see https://documentation.mailgun.com/en/latest/api-sending.html#sending
 */
const mailgunOutputSchema = {
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
    ampHtml: { type: 'string' },
    tVersion: { type: 'string' },
    tText: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    oTag: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      description: `Tag string. See Tagging for more information.`,
    },
    oDkim: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Enables/disabled DKIM signatures on per-message basis. Pass yes or no`,
    },
    oDeliverytime: {
      type: 'string',
      description: `Desired time of delivery. See Date Format. Note: Messages can be scheduled for a maximum of 3 days in the future.`,
    },
    oDeliverytimeOptimizePeriod: { type: 'string' },
    oTimeZoneLocalize: { type: 'string' },
    oTestmode: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Enables sending in test mode. Pass yes if needed. See Sending in Test Mode`,
    },
    oTracking: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Toggles tracking on a per-message basis, see Tracking Messages for details. Pass yes or no.`,
    },
    oTrackingClicks: {
      anyOf: [{ type: 'string', enum: ['yes', 'no', 'htmlonly'] }, { type: 'boolean' }],
      description: `Toggles clicks tracking on a per-message basis. Has higher priority than domain-level setting. Pass yes, no or htmlonly.`,
    },
    oTrackingOpens: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
      description: `Toggles opens tracking on a per-message basis. Has higher priority than domain-level setting. Pass yes or no.`,
    },
    oRequireTls: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    oSkipVerification: {
      anyOf: [{ type: 'string', enum: ['yes', 'no'] }, { type: 'boolean' }],
    },
    recipientVariables: { type: 'string' },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const mailgunProviderSchemas = {
  output: mailgunOutputSchema,
};
