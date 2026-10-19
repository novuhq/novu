import type { JsonSchema } from '../../../types/schema.types';

/**
 * FCM `send` schema
 *
 * @see https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages/send
 */
const fcmOutputSchema = {
  type: 'object',
  properties: {
    to: {
      description:
        'This parameter specifies the recipient of a message.\nThe value must be a registration token, notification key, or topic. Do not set this field when sending to multiple topics. See **condition**.\n',
      type: 'string',
    },
    registrationIds: {
      description:
        'This parameter specifies a list of devices (registration tokens, or IDs) receiving a multicast message. It must contain at least 1 and at most 1000 registration tokens.\nUse this parameter only for multicast messaging, not for single recipients. Multicast messages (sending to more than 1 registration tokens) are allowed using HTTP JSON format only.\n',
      type: 'array',
      items: {
        type: 'string',
      },
    },
    condition: {
      description:
        'This parameter specifies a logical expression of conditions that determine the message target.\nSupported condition: Topic, formatted as yourTopic in topics. This value is case-insensitive.\nSupported operators: &&, ||. Maximum two operators per topic message supported.\n',
      type: 'string',
    },
    notificationKey: {
      description:
        'This parameter is deprecated. Instead, use **to** to specify message recipients. For more information on how to send messages to multiple devices using **to**, see [Device Group Messaging](https://firebase.google.com/docs/cloud-messaging/notifications).\n',
      type: 'string',
    },
    collapseKey: {
      description:
        'This parameter identifies a group of messages (e.g., with ```"collapseKey": "Updates Available"```) that can be collapsed, so that only the last message gets sent when delivery can be resumed. This is intended to avoid sending too many of the same messages when the device comes back online or becomes active (see **delayWhileIdle**).\nNote that there is no guarantee of the order in which messages get sent.\nNote: A maximum of 4 different collapse keys is allowed at any given time. This means a FCM connection server can simultaneously store 4 different send-to-sync messages per client app. If you exceed this number, there is no guarantee which 4 collapse keys the FCM connection server will keep.\n',
      type: 'string',
    },
    priority: {
      description:
        "Sets the priority of the message. Valid values are normal and high. On iOS, these correspond to APNs priorities 5 and 10.\nBy default, messages are sent with normal priority. Normal priority optimizes the client app's battery consumption and should be used unless immediate delivery is required. For messages with normal priority, the app may receive the message with unspecified delay.\nWhen a message is sent with high priority, it is sent immediately, and the app can wake a sleeping device and open a network connection to your server.For more information, see [Setting the priority of a message](https://firebase.google.com/docs/cloud-messaging/concept-options#setting-the-priority-of-a-message).\n",
      type: 'string',
      enum: ['normal', 'high'],
    },
    contentAvailable: {
      description:
        'On iOS, use this field to represent **content-available** in the APNS payload. When a notification or message is sent and this is set to ```true```, an inactive client app is awoken. On Android, data messages wake the app by default. On Chrome, currently not supported.\n',
      type: 'boolean',
    },
    mutableContent: {
      description:
        'Currently for iOS 10+ devices only. On iOS, use this field to represent mutable-content in the APNS payload. When a notification is sent and this is set to true, the content of the notification can be modified before it is displayed, using a [Notification Service app extension](https://developer.apple.com/reference/usernotifications/unnotificationserviceextension). This parameter will be ignored for Android and web.\n',
      type: 'boolean',
    },
    delayWhileIdle: {
      description:
        'When this parameter is set to ```true```, it indicates that the message should not be sent until the device becomes active.\nThe default value is ```false```.\n',
      type: 'boolean',
    },
    timeToLive: {
      description:
        'This parameter specifies how long (in seconds) the message should be kept in FCM storage if the device is offline. The maximum time to live supported is 4 weeks, and the default value is 4 weeks. For more information, see [Setting the lifespan of a message](https://firebase.google.com/docs/cloud-messaging/concept-options#ttl).\n',
      type: 'number',
    },
    restrictedPackageName: {
      description:
        'This parameter specifies the package name of the application where the registration tokens must match in order to receive the message.\n',
      type: 'string',
    },
    dryRun: {
      description:
        'This parameter, when set to ```true```, allows developers to test a request without actually sending a message.\nThe default value is ```false```.\n',
      type: 'boolean',
    },
    data: {
      description:
        'This parameter specifies the custom key-value pairs of the message\'s payload.\nFor example, with ```"data":{"score":"3x1"}```:\nOn iOS, if the message is sent via APNS, it represents the custom data fields. If it is sent via FCM connection server, it would be represented as key value dictionary in ```AppDelegate application:didReceiveRemoteNotification:```.\nOn Android, this would result in an intent extra named **score** with the string value **3x1**.\nThe key should not be a reserved word ("from" or any word starting with "google" or "gcm"). Do not use any of the words defined in this table (such as **collapseKey**).\n',
      type: 'object',
      additionalProperties: {
        type: 'string',
      },
    },
    notification: {
      description:
        'Notification payload. For more information about notification message and data message options, see [Payload](https://firebase.google.com/docs/cloud-messaging/concept-options#notifications_and_data_messages).\n',
      type: 'object',
      properties: {
        title: {
          description:
            'Indicates notification title. This field is not visible on iOS phones and tablets. Field is required for android.',
          type: 'string',
        },
        body: {
          description: 'Indicates notification body text.',
          type: 'string',
        },
        icon: {
          description:
            'android: Indicates notification icon. Sets value to **myicon** for drawable resource **myicon**.',
          type: 'string',
        },
        sound: {
          description:
            "Indicates a sound to play when the device receives a notification.\n* iOS: Sound files can be in the main bundle of the client app or in the Library/Sounds folder of the app's data container. See the [iOS Developer Library](https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Chapters/IPhoneOSClientImp.html#//apple_ref/doc/uid/TP40008194-CH103-SW6) for more information).\n* android: Supports default or the filename of a sound resource bundled in the app. Sound files must reside in /res/raw/.\n",
          type: 'string',
        },
        badge: {
          description: 'iOS: Indicates the badge on the client app home icon.',
          type: 'string',
        },
        tag: {
          description:
            'android: Indicates whether each notification results in a new entry in the notification drawer.\nIf not set, each request creates a new notification.\nIf set, and a notification with the same tag is already being shown, the new notification replaces the existing one in the notification drawer.\n',
          type: 'string',
        },
        color: {
          description: 'android: Indicates color of the icon, expressed in #rrggbb format',
          type: 'string',
        },
        clickAction: {
          description:
            'Indicates the action associated with a user click on the notification.\n* iOS:  Corresponds to category in the APNs payload.\n* android: When this is set, an activity with a matching intent filter is launched when user clicks the notification.\n',
          type: 'string',
        },
        bodyLocKey: {
          description:
            'Indicates the key to the body string for localization.\n* iOS: Corresponds to "loc-key" in the APNs payload.\n* android: Use the key in the app\'s string resources when populating this value.\n',
          type: 'string',
        },
        bodyLocArgs: {
          description:
            'Indicates the string value to replace format specifiers in the body string for localization.\n* iOS: Corresponds to "loc-args" in the APNs payload.\n* android:  See [Formatting and Styling](https://developer.android.com/guide/topics/resources/string-resource.html#FormattingAndStyling).\n',
          type: 'string',
        },
        titleLocKey: {
          description:
            'Indicates the key to the title string for localization.\n* iOS: Corresponds to "title-loc-key" in the APNs payload.\n* android:  Use the key in the app\'s string resources when populating this value.\n',
          type: 'string',
        },
        titleLocArgs: {
          description:
            'Indicates the string value to replace format specifiers in the title string for localization.\n* iOS: Corresponds to "title-loc-args" in the APNs payload.\n* android: See [Formatting strings](https://developer.android.com/guide/topics/resources/string-resource.html#FormattingAndStyling).\n',
          type: 'string',
        },
      },
    },
  },
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const fcmProviderSchemas = {
  output: fcmOutputSchema,
};
