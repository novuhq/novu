import type { JsonSchema } from '../../../types/schema.types';

/**
 * Twilio `POST /2010-04-01/Accounts/{AccountSid}/Messages.json` schema
 *
 * @see https://www.twilio.com/docs/sms/api/message-resource
 */
const twilioOutputSchema = {
  type: 'object',
  properties: {
    to: {
      type: 'string',
      pattern: '^\\+[1-9]\\d{1,14}$',
      description:
        "The recipient's phone number in [E.164](https://www.twilio.com/docs/glossary/what-e164) format (for SMS/MMS) or [channel address](https://www.twilio.com/docs/messaging/channels), e.g. `whatsapp:+15552229999`.",
    },
    statusCallback: {
      type: 'string',
      format: 'uri',
      description:
        'The URL of the endpoint to which Twilio sends [Message status callback requests](https://www.twilio.com/docs/sms/api/message-resource#twilios-request-to-the-statuscallback-url). URL must contain a valid hostname and underscores are not allowed. If you include this parameter with the `messagingServiceSid`, Twilio uses this URL instead of the Status Callback URL of the [Messaging Service](https://www.twilio.com/docs/messaging/api/service-resource). ',
    },
    applicationSid: {
      type: 'string',
      minLength: 34,
      maxLength: 34,
      pattern: '^AP[0-9a-fA-F]{32}$',
      description:
        "The SID of the associated [TwiML Application](https://www.twilio.com/docs/usage/api/applications). [Message status callback requests](https://www.twilio.com/docs/sms/api/message-resource#twilios-request-to-the-statuscallback-url) are sent to the TwiML App's `statusCallback` URL. Note that the `statusCallback` parameter of a request takes priority over the `applicationSid` parameter; if both are included `applicationSid` is ignored.",
    },
    maxPrice: {
      type: 'number',
      description: '[OBSOLETE] This parameter will no longer have any effect as of 2024-06-03.',
    },
    provideFeedback: {
      type: 'boolean',
      description:
        'Boolean indicating whether or not you intend to provide delivery confirmation feedback to Twilio (used in conjunction with the [Message Feedback subresource](https://www.twilio.com/docs/sms/api/message-feedback-resource)). Default value is `false`.',
    },
    attempt: {
      type: 'integer',
      description:
        'Total number of attempts made (including this request) to send the message regardless of the provider used',
    },
    validityPeriod: {
      type: 'integer',
      description:
        "The maximum length in seconds that the Message can remain in Twilio's outgoing message queue. If a queued Message exceeds the `validityPeriod`, the Message is not sent. Accepted values are integers from `1` to `36000`. Default value is `36000`. A `validityPeriod` greater than `5` is recommended. [Learn more about the validity period](https://www.twilio.com/blog/take-more-control-of-outbound-messages-using-validity-period-html)",
    },
    forceDelivery: {
      type: 'boolean',
      description: 'Reserved',
    },
    contentRetention: {
      type: 'string',
      enum: ['retain', 'discard'],
      description: 'Determines if the message content can be stored or redacted based on privacy settings',
    },
    addressRetention: {
      type: 'string',
      enum: ['retain', 'obfuscate'],
      description: 'Determines if the address can be stored or obfuscated based on privacy settings',
    },
    smartEncoded: {
      type: 'boolean',
      description:
        'Whether to detect Unicode characters that have a similar GSM-7 character and replace them. Can be: `true` or `false`.',
    },
    persistentAction: {
      type: 'array',
      items: {
        type: 'string',
      },
      description:
        'Rich actions for non-SMS/MMS channels. Used for [sending location in WhatsApp messages](https://www.twilio.com/docs/whatsapp/message-features#location-messages-with-whatsapp).',
    },
    shortenUrls: {
      type: 'boolean',
      description:
        'For Messaging Services with [Link Shortening configured](https://www.twilio.com/docs/messaging/features/link-shortening) only: A Boolean indicating whether or not Twilio should shorten links in the `body` of the Message. Default value is `false`. If `true`, the `messagingServiceSid` parameter must also be provided.',
    },
    scheduleType: {
      type: 'string',
      enum: ['fixed'],
      description:
        'For Messaging Services only: Include this parameter with a value of `fixed` in conjunction with the `sendAt` parameter in order to [schedule a Message](https://www.twilio.com/docs/messaging/features/message-scheduling).',
    },
    sendAt: {
      type: 'string',
      format: 'date-time',
      description: 'The time that Twilio will send the message. Must be in ISO 8601 format.',
    },
    sendAsMms: {
      type: 'boolean',
      description:
        'If set to `true`, Twilio delivers the message as a single MMS message, regardless of the presence of media.',
    },
    contentVariables: {
      type: 'string',
      description:
        "For [Content Editor/API](https://www.twilio.com/docs/content) only: Key-value pairs of [Template variables](https://www.twilio.com/docs/content/using-variables-with-content-api) and their substitution values. `contentSid` parameter must also be provided. If values are not defined in the `contentVariables` parameter, the [Template's default placeholder values](https://www.twilio.com/docs/content/content-api-resources#create-templates) are used.",
    },
    riskCheck: {
      type: 'string',
      enum: ['enable', 'disable'],
      description:
        'Include this parameter with a value of `disable` to skip any kind of risk check on the respective message request.',
    },
    from: {
      type: 'string',
      pattern: '^\\+[1-9]\\d{1,14}$',
      description:
        "The sender's Twilio phone number (in [E.164](https://en.wikipedia.org/wiki/E.164) format), [alphanumeric sender ID](https://www.twilio.com/docs/sms/quickstart), [Wireless SIM](https://www.twilio.com/docs/iot/wireless/programmable-wireless-send-machine-machine-sms-commands), [short code](https://www.twilio.com/en-us/messaging/channels/sms/short-codes), or [channel address](https://www.twilio.com/docs/messaging/channels) (e.g., `whatsapp:+15554449999`). The value of the `from` parameter must be a sender that is hosted within Twilio and belongs to the Account creating the Message. If you are using `messagingServiceSid`, this parameter can be empty (Twilio assigns a `from` value from the Messaging Service's Sender Pool) or you can provide a specific sender from your Sender Pool.",
    },
    messagingServiceSid: {
      type: 'string',
      minLength: 34,
      maxLength: 34,
      pattern: '^MG[0-9a-fA-F]{32}$',
      description:
        "The SID of the [Messaging Service](https://www.twilio.com/docs/messaging/services) you want to associate with the Message. When this parameter is provided and the `from` parameter is omitted, Twilio selects the optimal sender from the Messaging Service's Sender Pool. You may also provide a `from` parameter if you want to use a specific Sender from the Sender Pool.",
    },
    body: {
      type: 'string',
      description:
        'The text content of the outgoing message. Can be up to 1,600 characters in length. SMS only: If the `body` contains more than 160 [GSM-7](https://www.twilio.com/docs/glossary/what-is-gsm-7-character-encoding) characters (or 70 [UCS-2](https://www.twilio.com/docs/glossary/what-is-ucs-2-character-encoding) characters), the message is segmented and charged accordingly. For long `body` text, consider using the [sendAsMms parameter](https://www.twilio.com/blog/mms-for-long-text-messages).',
    },
    mediaUrl: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
      description:
        'The URL of media to include in the Message content. `jpeg`, `jpg`, `gif`, and `png` file types are fully supported by Twilio and content is formatted for delivery on destination devices. The media size limit is 5 MB for supported file types (`jpeg`, `jpg`, `png`, `gif`) and 500 KB for [other types](https://www.twilio.com/docs/messaging/guides/accepted-mime-types) of accepted media. To send more than one image in the message, provide multiple `mediaUrl` parameters in the POST request. You can include up to ten `mediaUrl` parameters per message. [International](https://support.twilio.com/hc/en-us/articles/223179808-Sending-and-receiving-MMS-messages) and [carrier](https://support.twilio.com/hc/en-us/articles/223133707-Is-MMS-supported-for-all-carriers-in-US-and-Canada-) limits apply.',
    },
    contentSid: {
      type: 'string',
      minLength: 34,
      maxLength: 34,
      pattern: '^HX[0-9a-fA-F]{32}$',
      description:
        "For [Content Editor/API](https://www.twilio.com/docs/content) only: The SID of the Content Template to be used with the Message, e.g., `HXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`. If this parameter is not provided, a Content Template is not used. Find the SID in the Console on the Content Editor page. For Content API users, the SID is found in Twilio's response when [creating the Template](https://www.twilio.com/docs/content/content-api-resources#create-templates) or by [fetching your Templates](https://www.twilio.com/docs/content/content-api-resources#fetch-all-content-resources).",
    },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const twilioProviderSchemas = {
  output: twilioOutputSchema,
};
