import { Schema } from '../../../types';

/**
 * Twilio `POST /2010-04-01/Accounts/{AccountSid}/Messages.json` schema
 *
 * @see https://www.twilio.com/docs/sms/api/message-resource
 */
const twilioOutputSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'string',
      nullable: true,
      description: 'The text content of the message',
    },
    num_segments: {
      type: 'string',
      nullable: true,
      description:
        "The number of segments that make up the complete message. SMS message bodies that exceed the [character limit](https://www.twilio.com/docs/glossary/what-sms-character-limit) are segmented and charged as multiple messages. Note: For messages sent via a Messaging Service, `num_segments` is initially `0`, since a sender hasn't yet been assigned.",
    },
    direction: {
      type: 'string',
      nullable: true,
      description:
        'The direction of the message. Can be: `inbound` for incoming messages, `outbound-api` for messages created by the REST API, `outbound-call` for messages created during a call, or `outbound-reply` for messages created in response to an incoming message.',
      enum: ['inbound', 'outbound-api', 'outbound-call', 'outbound-reply'],
    },
    from: {
      type: 'string',
      format: 'phone-number',
      nullable: true,
      description:
        "The sender's phone number (in [E.164](https://en.wikipedia.org/wiki/E.164) format), [alphanumeric sender ID](https://www.twilio.com/docs/sms/quickstart), [Wireless SIM](https://www.twilio.com/docs/iot/wireless/programmable-wireless-send-machine-machine-sms-commands), [short code](https://www.twilio.com/en-us/messaging/channels/sms/short-codes), or  [channel address](https://www.twilio.com/docs/messaging/channels) (e.g., `whatsapp:+15554449999`). For incoming messages, this is the number or channel address of the sender. For outgoing messages, this value is a Twilio phone number, alphanumeric sender ID, short code, or channel address from which the message is sent.",
      'x-twilio': {
        pii: {
          handling: 'standard',
          deleteSla: 120,
        },
      },
    },
    to: {
      type: 'string',
      nullable: true,
      description:
        "The recipient's phone number (in [E.164](https://en.wikipedia.org/wiki/E.164) format) or [channel address](https://www.twilio.com/docs/messaging/channels) (e.g. `whatsapp:+15552229999`)",
      'x-twilio': {
        pii: {
          handling: 'standard',
          deleteSla: 120,
        },
      },
    },
    date_updated: {
      type: 'string',
      format: 'date-time-rfc-2822',
      nullable: true,
      description:
        'The [RFC 2822](https://datatracker.ietf.org/doc/html/rfc2822#section-3.3) timestamp (in GMT) of when the Message resource was last updated',
    },
    price: {
      type: 'string',
      nullable: true,
      description:
        'The amount billed for the message in the currency specified by `price_unit`. The `price` is populated after the message has been sent/received, and may not be immediately available. View the [Pricing page](https://www.twilio.com/en-us/pricing) for more details.',
    },
    error_message: {
      type: 'string',
      nullable: true,
      description:
        'The description of the `error_code` if the Message `status` is `failed` or `undelivered`. If no error was encountered, the value is `null`.',
    },
    uri: {
      type: 'string',
      nullable: true,
      description: 'The URI of the Message resource, relative to `https://api.twilio.com`.',
    },
    account_sid: {
      type: 'string',
      minLength: 34,
      maxLength: 34,
      pattern: '^AC[0-9a-fA-F]{32}$',
      nullable: true,
      description:
        'The SID of the [Account](https://www.twilio.com/docs/iam/api/account) associated with the Message resource',
    },
    num_media: {
      type: 'string',
      nullable: true,
      description: 'The number of media files associated with the Message resource.',
    },
    status: {
      type: 'string',
      nullable: true,
      description:
        'The status of the Message. Possible values: `accepted`, `scheduled`, `canceled`, `queued`, `sending`, `sent`, `failed`, `delivered`, `undelivered`, `receiving`, `received`, or `read` (WhatsApp only). For more information, See [detailed descriptions](https://www.twilio.com/docs/sms/api/message-resource#message-status-values).',
      enum: [
        'queued',
        'sending',
        'sent',
        'failed',
        'delivered',
        'undelivered',
        'receiving',
        'received',
        'accepted',
        'scheduled',
        'read',
        'partially_delivered',
        'canceled',
      ],
    },
    messaging_service_sid: {
      type: 'string',
      minLength: 34,
      maxLength: 34,
      pattern: '^MG[0-9a-fA-F]{32}$',
      nullable: true,
      description:
        'The SID of the [Messaging Service](https://www.twilio.com/docs/messaging/api/service-resource) associated with the Message resource. A unique default value is assigned if a Messaging Service is not used.',
    },
    sid: {
      type: 'string',
      minLength: 34,
      maxLength: 34,
      pattern: '^(SM|MM)[0-9a-fA-F]{32}$',
      nullable: true,
      description: 'The unique, Twilio-provided string that identifies the Message resource.',
    },
    date_sent: {
      type: 'string',
      format: 'date-time-rfc-2822',
      nullable: true,
      description:
        'The [RFC 2822](https://datatracker.ietf.org/doc/html/rfc2822#section-3.3) timestamp (in GMT) of when the Message was sent. For an outgoing message, this is when Twilio sent the message. For an incoming message, this is when Twilio sent the HTTP request to your incoming message webhook URL.',
    },
    date_created: {
      type: 'string',
      format: 'date-time-rfc-2822',
      nullable: true,
      description:
        'The [RFC 2822](https://datatracker.ietf.org/doc/html/rfc2822#section-3.3) timestamp (in GMT) of when the Message resource was created',
    },
    error_code: {
      type: 'integer',
      nullable: true,
      description:
        'The [error code](https://www.twilio.com/docs/api/errors) returned if the Message `status` is `failed` or `undelivered`. If no error was encountered, the value is `null`.',
    },
    price_unit: {
      type: 'string',
      format: 'currency',
      nullable: true,
      description:
        'The currency in which `price` is measured, in [ISO 4127](https://www.iso.org/iso/home/standards/currency_codes.htm) format (e.g. `usd`, `eur`, `jpy`).',
    },
    api_version: {
      type: 'string',
      nullable: true,
      description: 'The API version used to process the Message',
    },
    subresource_uris: {
      type: 'object',
      format: 'uri-map',
      nullable: true,
      description: 'A list of related resources identified by their URIs relative to `https://api.twilio.com`',
    },
  },
  required: [],
  additionalProperties: true,
} as const satisfies Schema;

export const twilioProviderSchemas = {
  output: twilioOutputSchema,
};
