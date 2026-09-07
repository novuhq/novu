import type { JsonSchema } from '../../../types/schema.types';

/**
 * Expo `POST /v2/push/send` schema
 *
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */
const expoOutputSchema = {
  type: 'object',
  properties: {
    to: {
      anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
      description: `An Expo push token or an array of Expo push tokens specifying the recipient(s) of this message.`,
    },
    data: {
      type: 'object',
      additionalProperties: true,
      description: `A JSON object delivered to your app. It may be up to about 4KiB; the total notification payload sent to Apple and Google must be at most 4KiB or else you will get a "Message Too Big" error.`,
    },
    title: {
      type: 'string',
      description: `The title to display in the notification. Often displayed above the notification body.`,
    },
    subtitle: { type: 'string', description: `The subtitle to display in the notification below the title.` },
    body: { type: 'string', description: `The message to display in the notification.` },
    sound: {
      anyOf: [
        { type: 'string' },
        { type: 'null' },
        {
          type: 'object',
          properties: {
            name: { anyOf: [{ type: 'string', enum: ['default'] }, { type: 'null' }] },
            volume: { type: 'number' },
            critical: { type: 'boolean' },
          },
          additionalProperties: true,
        },
      ],
      description: `Play a sound when the recipient receives this notification. Specify default to play the device's default notification sound, or omit this field to play no sound. Custom sounds are not supported.`,
    },
    ttl: {
      type: 'number',
      description: `Time to Live: the number of seconds for which the message may be kept around for redelivery if it hasn't been delivered yet. Defaults to undefined to use the respective defaults of each provider (2419200 (4 weeks) for Android/FCM and 0 for iOS/APNs).`,
    },
    expiration: {
      type: 'number',
      description: `Timestamp since the Unix epoch specifying when the message expires. Same effect as ttl (ttl takes precedence over expiration).`,
    },
    priority: {
      type: 'string',
      enum: ['default', 'normal', 'high'],
      description: `The delivery priority of the message. Specify default or omit this field to use the default priority on each platform ("normal" on Android and "high" on iOS).`,
    },
    badge: {
      type: 'number',
      description: `Number to display in the badge on the app icon. Specify zero to clear the badge.`,
    },
    channelId: {
      type: 'string',
      description: `ID of the Notification Channel through which to display this notification. If an ID is specified but the corresponding channel does not exist on the device (that has not yet been created by your app), the notification will not be displayed to the user.`,
    },
    categoryId: {
      type: 'string',
      description: `ID of the notification category that this notification is associated with.`,
    },
    mutableContent: {
      type: 'boolean',
      description: `Specifies whether this notification can be intercepted by the client app. In Expo Go, this defaults to true, and if you change that to false, you may experience issues. In standalone and bare apps, this defaults to false.`,
    },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const expoProviderSchemas = {
  output: expoOutputSchema,
};
