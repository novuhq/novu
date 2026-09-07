import type { JsonSchema } from '../../../types/schema.types';

const sound = {
  anyOf: [
    { type: 'string' },
    {
      type: 'object',
      additionalProperties: true,
      properties: { name: { type: 'string' }, volume: { type: 'number' }, critical: { type: 'number' } },
      required: ['name', 'volume', 'critical'],
    },
  ],
} satisfies JsonSchema;

/**
 * APNS `POST /3/device/{device_token}` schema
 *
 * @see https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns
 */
const apnsOutputSchema = {
  type: 'object',
  properties: {
    topic: { type: 'string', description: `The destination topic for the notification.` },
    id: {
      type: 'string',
      description: `A UUID to identify the notification with APNS. If an id is not supplied, APNS will generate one automatically. If an error occurs the response will contain the id. This property populates the apns-id header.`,
    },
    expiry: {
      type: 'number',
      description: `A UNIX timestamp when the notification should expire. If the notification cannot be delivered to the device, APNS will retry until it expires. An expiry of 0 indicates that the notification expires immediately, therefore no retries will be attempted.`,
    },
    priority: {
      type: 'number',
      description: `Provide one of the following values:

10 - The push notification is sent to the device immediately. (Default)
The push notification must trigger an alert, sound, or badge on the device. It is an error to use this priority for a push notification that contains only the content-available key.

5 - The push message is sent at a time that conserves power on the device receiving it.`,
    },
    collapseId: { type: 'string' },
    pushType: {
      type: 'string',
      enum: ['background', 'alert', 'voip'],
      description: `The type of the notification. The value of this header is alert or background. Specify alert when the delivery of your notification displays an alert, plays a sound, or badges your app's icon. Specify background for silent notifications that do not interact with the user.

The value of this header must accurately reflect the contents of your notification's payload. If there is a mismatch, or if the header is missing on required systems, APNs may delay the delivery of the notification or drop it altogether.`,
    },
    threadId: { type: 'string' },
    payload: { type: 'object', additionalProperties: true },
    aps: {
      type: 'object',
      additionalProperties: true,
      properties: {
        badge: { type: 'number' },
        sound,
        category: { type: 'string' },
        contentAvailable: { type: 'number' },
        launchImage: { type: 'number' },
        mutableContent: { type: 'number' },
        urlArgs: { type: 'array', items: { type: 'string' } },
      },
    },
    rawPayload: { type: 'object', additionalProperties: true },
    badge: { type: 'number' },
    sound,
    alert: {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          additionalProperties: true,
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            subtitle: { type: 'string' },
            titleLocKey: { type: 'string' },
            titleLocArgs: { type: 'array', items: { type: 'string' } },
            actionLocKey: { type: 'string' },
            locKey: { type: 'string' },
            locArgs: { type: 'array', items: { type: 'string' } },
            launchImage: { type: 'string' },
          },
          required: ['body'],
        },
      ],
    },
    contentAvailable: { type: 'boolean' },
    mutableContent: { type: 'boolean' },
    mdm: {
      anyOf: [
        { type: 'string' },
        {
          type: 'object',
          additionalProperties: true,
        },
      ],
    },
    urlArgs: { type: 'array', items: { type: 'string' } },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const apnsProviderSchemas = {
  output: apnsOutputSchema,
};
