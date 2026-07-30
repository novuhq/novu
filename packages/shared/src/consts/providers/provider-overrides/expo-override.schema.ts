import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';

/**
 * Hand-written Expo push message override schema (Pattern B). Top-level fields follow
 * https://docs.expo.dev/push-notifications/sending-notifications; `sound` also accepts the
 * critical-alert object form used by expo-server-sdk (docs list only `string | null`).
 * `to` is omitted so autocomplete never suggests device tokens (Novu resolves them); send
 * paths must not strip a caller-supplied `to`.
 */
export const expoOverrideJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    data: {
      type: 'object',
      additionalProperties: true,
      description:
        'A JSON object delivered to your app. It may be up to about 4KiB; the total notification payload sent to Apple and Google must be at most 4KiB or else you will get a "Message Too Big" error.',
    },
    title: {
      type: 'string',
      description:
        'The title to display in the notification. Often displayed above the notification body. Maps to AndroidNotification.title and aps.alert.title. Title is not seeded from the step; set it explicitly when needed.',
    },
    body: {
      type: 'string',
      description:
        'The message to display in the notification. Falls back to the default message content when omitted. Maps to AndroidNotification.body and aps.alert.body.',
    },
    ttl: {
      type: 'number',
      description:
        "Time to Live: the number of seconds for which the message may be kept around for redelivery if it hasn't been delivered yet. Defaults to undefined to use the respective defaults of each provider (1 month for Android/FCM as well as iOS/APNs).",
    },
    expiration: {
      type: 'number',
      description:
        'Timestamp since the Unix epoch specifying when the message expires. Same effect as ttl (ttl takes precedence over expiration).',
    },
    priority: {
      type: 'string',
      enum: ['default', 'normal', 'high'],
      description:
        'The delivery priority of the message. Specify default or omit this field to use the default priority on each platform ("normal" on Android and "high" on iOS).',
    },
    richContent: {
      type: 'object',
      additionalProperties: false,
      properties: {
        image: {
          type: 'string',
          description:
            'Image URL shown with the notification. Android shows it out of the box; iOS needs a Notification Service Extension.',
        },
      },
      description:
        'Currently supports setting a notification image. Provide an object with key image and value of type string, which is the image URL.',
    },
    categoryId: {
      type: 'string',
      description: 'ID of the notification category that this notification is associated with.',
    },
    collapseId: {
      type: 'string',
      description:
        'An identifier for collapsing notifications. On Android, this only coalesces messages in transit and maps to the FCM collapse_key. To also replace already-displayed notifications on Android, use tag. On iOS, this both coalesces messages in transit and replaces already-displayed notifications and maps to apns-collapse-id.',
    },
    _contentAvailable: {
      type: 'boolean',
      description:
        'When set to true, the notification will cause the iOS app to start in the background to run a background task. Your app needs to be configured to support this.',
    },
    subtitle: {
      type: 'string',
      description: 'The subtitle to display in the notification below the title. Maps to aps.alert.subtitle.',
    },
    sound: {
      anyOf: [
        { type: 'string' },
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            critical: {
              type: 'boolean',
              description: 'Whether to play the sound as a critical alert.',
            },
            name: {
              type: 'string',
              description: 'Sound file name, or default for the device default notification sound.',
            },
            volume: {
              type: 'number',
              description: 'Volume for critical alerts, from 0.0 to 1.0.',
            },
          },
        },
      ],
      description:
        "Play a sound when the recipient receives this notification. Specify default to play the device's default notification sound, null/omit for no sound, or an object for critical-alert options.",
    },
    badge: {
      type: 'number',
      description: 'Number to display in the badge on the app icon. Specify zero to clear the badge.',
    },
    interruptionLevel: {
      type: 'string',
      enum: ['active', 'critical', 'passive', 'time-sensitive'],
      description:
        'The importance and delivery timing of a notification. The string values correspond to the UNNotificationInterruptionLevel enumeration cases.',
    },
    mutableContent: {
      type: 'boolean',
      description: 'Specifies whether this notification can be intercepted by the client app. Defaults to false.',
    },
    channelId: {
      type: 'string',
      description:
        'ID of the Notification Channel through which to display this notification. If an ID is specified but the corresponding channel does not exist on the device, the notification will not be displayed to the user.',
    },
    icon: {
      type: 'string',
      description:
        "The notification's icon. Name of an Android drawable resource (example: myicon). Defaults to the icon specified in the config plugin.",
    },
    tag: {
      type: 'string',
      description:
        'An identifier for replacing notifications already displayed on the device. If the device is already showing a notification with the same tag, the new notification replaces it. Separate from collapseId. Maps to the FCM notification.tag field.',
    },
  },
} as const satisfies JSONSchemaDto;
