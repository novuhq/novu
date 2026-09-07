import type { JsonSchema } from '../../../types/schema.types';

/**
 * OneSignal `POST /notifications` schema
 *
 * @see https://documentation.onesignal.com/reference/create-notification
 */
const oneSignalOutputSchema = {
  allOf: [
    {
      allOf: [
        {
          anyOf: [
            {
              type: 'object',
              properties: {
                includedSegments: {
                  type: 'array',
                  description:
                    'The segment names you want to target. Users in these segments will receive a notification. This targeting parameter is only compatible with excludedSegments.\nExample: ["Active Users", "Inactive Users"]\n',
                  items: {
                    type: 'string',
                  },
                },
                excludedSegments: {
                  type: 'array',
                  description:
                    'Segment that will be excluded when sending. Users in these segments will not receive a notification, even if they were included in includedSegments. This targeting parameter is only compatible with includedSegments.\nExample: ["Active Users", "Inactive Users"]\n',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
            {
              type: 'object',
              properties: {
                includePlayerIds: {
                  type: 'array',
                  description:
                    'Specific playerids to send your notification to. _Does not require API Auth Key.\nDo not combine with other targeting parameters. Not compatible with any other targeting parameters.\nExample: ["1dd608f2-c6a1-11e3-851d-000c2940e62c"]\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                  nullable: true,
                },
                includeExternalUserIds: {
                  type: 'array',
                  description:
                    'Target specific devices by custom user IDs assigned via API.\nNot compatible with any other targeting parameters\nExample: ["custom-id-assigned-by-api"]\nREQUIRED: REST API Key Authentication\nLimit of 2,000 entries per REST API call.\nNote: If targeting push, email, or sms subscribers with same ids, use with channelForExternalUserIds to indicate you are sending a push or email or sms.\n',
                  items: {
                    type: 'string',
                  },
                  nullable: true,
                },
                includeEmailTokens: {
                  type: 'array',
                  description:
                    'Recommended for Sending Emails - Target specific email addresses.\nIf an email does not correspond to an existing user, a new user will be created.\nExample: nick@catfac.ts\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includePhoneNumbers: {
                  type: 'array',
                  description:
                    'Recommended for Sending SMS - Target specific phone numbers. The phone number should be in the E.164 format. Phone number should be an existing subscriber on OneSignal. Refer our docs to learn how to add phone numbers to OneSignal.\nExample phone number: +1999999999\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeIosTokens: {
                  type: 'array',
                  description:
                    'Not Recommended: Please consider using includePlayerIds or includeExternalUserIds instead.\nTarget using iOS device tokens.\nWarning: Only works with Production tokens.\nAll non-alphanumeric characters must be removed from each token. If a token does not correspond to an existing user, a new user will be created.\nExample: ce777617da7f548fe7a9ab6febb56cf39fba6d38203...\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeWpWnsUris: {
                  type: 'array',
                  description:
                    'Not Recommended: Please consider using includePlayerIds or includeExternalUserIds instead.\nTarget using Windows URIs. If a token does not correspond to an existing user, a new user will be created.\nExample: http://s.notify.live.net/u/1/bn1/HmQAAACPaLDr-...\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeAmazonRegIds: {
                  type: 'array',
                  description:
                    'Not Recommended: Please consider using includePlayerIds or includeExternalUserIds instead.\nTarget using Amazon ADM registration IDs. If a token does not correspond to an existing user, a new user will be created.\nExample: amzn1.adm-registration.v1.XpvSSUk0Rc3hTVVV...\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeChromeRegIds: {
                  type: 'array',
                  description:
                    'Not Recommended: Please consider using includePlayerIds or includeExternalUserIds instead.\nTarget using Chrome App registration IDs. If a token does not correspond to an existing user, a new user will be created.\nExample: APA91bEeiUeSukAAUdnw3O2RB45FWlSpgJ7Ji_...\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeChromeWebRegIds: {
                  type: 'array',
                  description:
                    'Not Recommended: Please consider using includePlayerIds or includeExternalUserIds instead.\nTarget using Chrome Web Push registration IDs. If a token does not correspond to an existing user, a new user will be created.\nExample: APA91bEeiUeSukAAUdnw3O2RB45FWlSpgJ7Ji_...\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeAndroidRegIds: {
                  type: 'array',
                  description:
                    'Not Recommended: Please consider using includePlayerIds or includeExternalUserIds instead.\nTarget using Android device registration IDs. If a token does not correspond to an existing user, a new user will be created.\nExample: APA91bEeiUeSukAAUdnw3O2RB45FWlSpgJ7Ji_...\nLimit of 2,000 entries per REST API call\n',
                  items: {
                    type: 'string',
                  },
                },
                includeAliases: {
                  type: 'object',
                  properties: {
                    aliasLabel: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                  },
                  nullable: true,
                },
                targetChannel: {
                  type: 'string',
                  enum: ['push', 'email', 'sms'],
                },
              },
            },
          ],
        },
        {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            value: {
              type: 'integer',
              readOnly: true,
            },
            name: {
              type: 'string',
              description:
                'Required for SMS Messages.\nAn identifier for tracking message within the OneSignal dashboard or export analytics.\nNot shown to end user.',
              writeOnly: true,
              nullable: true,
            },
            aggregation: {
              type: 'string',
              enum: ['sum', 'count'],
              readOnly: true,
            },
            isIos: {
              type: 'boolean',
              description: "Indicates whether to send to all devices registered under your app's Apple iOS platform.",
              writeOnly: true,
              nullable: true,
            },
            isAndroid: {
              type: 'boolean',
              description:
                "Indicates whether to send to all devices registered under your app's Google Android platform.",
              writeOnly: true,
              nullable: true,
            },
            isHuawei: {
              type: 'boolean',
              description:
                "Indicates whether to send to all devices registered under your app's Huawei Android platform.",
              writeOnly: true,
              nullable: true,
            },
            isAnyWeb: {
              type: 'boolean',
              description:
                'Indicates whether to send to all subscribed web browser users, including Chrome, Firefox, and Safari.\nYou may use this instead as a combined flag instead of separately enabling isChromeWeb, isFirefox, and isSafari, though the three options are equivalent to this one.\n',
              writeOnly: true,
              nullable: true,
            },
            isChromeWeb: {
              type: 'boolean',
              writeOnly: true,
              nullable: true,
              description:
                'Indicates whether to send to all Google Chrome, Chrome on Android, and Mozilla Firefox users registered under your Chrome & Firefox web push platform.',
            },
            isFirefox: {
              type: 'boolean',
              writeOnly: true,
              nullable: true,
              description:
                'Indicates whether to send to all Mozilla Firefox desktop users registered under your Firefox web push platform.',
            },
            isSafari: {
              type: 'boolean',
              writeOnly: true,
              nullable: true,
              description:
                "Does not support iOS Safari. Indicates whether to send to all Apple's Safari desktop users registered under your Safari web push platform. Read more iOS Safari",
            },
            isWpWns: {
              type: 'boolean',
              writeOnly: true,
              nullable: true,
              description: "Indicates whether to send to all devices registered under your app's Windows platform.",
            },
            isAdm: {
              type: 'boolean',
              writeOnly: true,
              nullable: true,
              description: "Indicates whether to send to all devices registered under your app's Amazon Fire platform.",
            },
            isChrome: {
              type: 'boolean',
              writeOnly: true,
              nullable: true,
              description:
                "This flag is not used for web push Please see isChromeWeb for sending to web push users. This flag only applies to Google Chrome Apps & Extensions.\nIndicates whether to send to all devices registered under your app's Google Chrome Apps & Extension platform.\n",
            },
            channelForExternalUserIds: {
              type: 'string',
              writeOnly: true,
              description:
                'Indicates if the message type when targeting with includeExternalUserIds for cases where an email, sms, and/or push subscribers have the same external user id.\nExample: Use the string "push" to indicate you are sending a push notification or the string "email"for sending emails or "sms"for sending SMS.\n',
            },
            appId: {
              type: 'string',
              description:
                'Required: Your OneSignal Application ID, which can be found in Keys & IDs.\nIt is a UUID and looks similar to 8250eaf6-1a58-489e-b136-7c74a864b434.\n',
              writeOnly: true,
            },
            externalId: {
              type: 'string',
              description:
                "Correlation and idempotency key.\nA request received with this parameter will first look for another notification with the same externalId. If one exists, a notification will not be sent, and result of the previous operation will instead be returned. Therefore, if you plan on using this feature, it's important to use a good source of randomness to generate the UUID passed here.\nThis key is only idempotent for 30 days. After 30 days, the notification could be removed from our system and a notification with the same externalId will be sent again.\n  See Idempotent Notification Requests for more details\nwriteOnly: true\n",
              nullable: true,
            },
            contents: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    en: {
                      type: 'string',
                      description: 'Text in English.  Will be used as a fallback',
                    },
                    ar: {
                      type: 'string',
                      description: 'Text in Arabic.',
                    },
                    bs: {
                      type: 'string',
                      description: 'Text in Bosnian.',
                    },
                    bg: {
                      type: 'string',
                      description: 'Text in Bulgarian.',
                    },
                    ca: {
                      type: 'string',
                      description: 'Text in Catalan.',
                    },
                    'zh-Hans': {
                      type: 'string',
                      description: 'Text in Chinese (Simplified).',
                    },
                    'zh-Hant': {
                      type: 'string',
                      description: 'Text in Chinese (Traditional).',
                    },
                    zh: {
                      type: 'string',
                      description: 'Alias for zh-Hans.',
                    },
                    hr: {
                      type: 'string',
                      description: 'Text in Croatian.',
                    },
                    cs: {
                      type: 'string',
                      description: 'Text in Czech.',
                    },
                    da: {
                      type: 'string',
                      description: 'Text in Danish.',
                    },
                    nl: {
                      type: 'string',
                      description: 'Text in Dutch.',
                    },
                    et: {
                      type: 'string',
                      description: 'Text in Estonian.',
                    },
                    fi: {
                      type: 'string',
                      description: 'Text in Finnish.',
                    },
                    fr: {
                      type: 'string',
                      description: 'Text in French.',
                    },
                    ka: {
                      type: 'string',
                      description: 'Text in Georgian.',
                    },
                    de: {
                      type: 'string',
                      description: 'Text in German.',
                    },
                    el: {
                      type: 'string',
                      description: 'Text in Greek.',
                    },
                    hi: {
                      type: 'string',
                      description: 'Text in Hindi.',
                    },
                    he: {
                      type: 'string',
                      description: 'Text in Hebrew.',
                    },
                    hu: {
                      type: 'string',
                      description: 'Text in Hungarian.',
                    },
                    id: {
                      type: 'string',
                      description: 'Text in Indonesian.',
                    },
                    it: {
                      type: 'string',
                      description: 'Text in Italian.',
                    },
                    ja: {
                      type: 'string',
                      description: 'Text in Japanese.',
                    },
                    ko: {
                      type: 'string',
                      description: 'Text in Korean.',
                    },
                    lv: {
                      type: 'string',
                      description: 'Text in Latvian.',
                    },
                    lt: {
                      type: 'string',
                      description: 'Text in Lithuanian.',
                    },
                    ms: {
                      type: 'string',
                      description: 'Text in Malay.',
                    },
                    nb: {
                      type: 'string',
                      description: 'Text in Norwegian.',
                    },
                    pl: {
                      type: 'string',
                      description: 'Text in Polish.',
                    },
                    fa: {
                      type: 'string',
                      description: 'Text in Persian.',
                    },
                    pt: {
                      type: 'string',
                      description: 'Text in Portuguese.',
                    },
                    pa: {
                      type: 'string',
                      description: 'Text in Punjabi.',
                    },
                    ro: {
                      type: 'string',
                      description: 'Text in Romanian.',
                    },
                    ru: {
                      type: 'string',
                      description: 'Text in Russian.',
                    },
                    sr: {
                      type: 'string',
                      description: 'Text in Serbian.',
                    },
                    sk: {
                      type: 'string',
                      description: 'Text in Slovak.',
                    },
                    es: {
                      type: 'string',
                      description: 'Text in Spanish.',
                    },
                    sv: {
                      type: 'string',
                      description: 'Text in Swedish.',
                    },
                    th: {
                      type: 'string',
                      description: 'Text in Thai.',
                    },
                    tr: {
                      type: 'string',
                      description: 'Text in Turkish.',
                    },
                    uk: {
                      type: 'string',
                      description: 'Text in Ukrainian.',
                    },
                    vi: {
                      type: 'string',
                      description: 'Text in Vietnamese.',
                    },
                  },
                },
                {
                  description:
                    'Required unless contentAvailable=true or templateId is set.\nThe message\'s content (excluding the title), a map of language codes to text for each language.\nEach hash must have a language code string for a key, mapped to the localized text you would like users to receive for that language.\nThis field supports inline substitutions.\nEnglish must be included in the hash.\nExample: {"en": "English Message", "es": "Spanish Message"}\n',
                  writeOnly: true,
                },
              ],
            },
            headings: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    en: {
                      type: 'string',
                      description: 'Text in English.  Will be used as a fallback',
                    },
                    ar: {
                      type: 'string',
                      description: 'Text in Arabic.',
                    },
                    bs: {
                      type: 'string',
                      description: 'Text in Bosnian.',
                    },
                    bg: {
                      type: 'string',
                      description: 'Text in Bulgarian.',
                    },
                    ca: {
                      type: 'string',
                      description: 'Text in Catalan.',
                    },
                    'zh-Hans': {
                      type: 'string',
                      description: 'Text in Chinese (Simplified).',
                    },
                    'zh-Hant': {
                      type: 'string',
                      description: 'Text in Chinese (Traditional).',
                    },
                    zh: {
                      type: 'string',
                      description: 'Alias for zh-Hans.',
                    },
                    hr: {
                      type: 'string',
                      description: 'Text in Croatian.',
                    },
                    cs: {
                      type: 'string',
                      description: 'Text in Czech.',
                    },
                    da: {
                      type: 'string',
                      description: 'Text in Danish.',
                    },
                    nl: {
                      type: 'string',
                      description: 'Text in Dutch.',
                    },
                    et: {
                      type: 'string',
                      description: 'Text in Estonian.',
                    },
                    fi: {
                      type: 'string',
                      description: 'Text in Finnish.',
                    },
                    fr: {
                      type: 'string',
                      description: 'Text in French.',
                    },
                    ka: {
                      type: 'string',
                      description: 'Text in Georgian.',
                    },
                    de: {
                      type: 'string',
                      description: 'Text in German.',
                    },
                    el: {
                      type: 'string',
                      description: 'Text in Greek.',
                    },
                    hi: {
                      type: 'string',
                      description: 'Text in Hindi.',
                    },
                    he: {
                      type: 'string',
                      description: 'Text in Hebrew.',
                    },
                    hu: {
                      type: 'string',
                      description: 'Text in Hungarian.',
                    },
                    id: {
                      type: 'string',
                      description: 'Text in Indonesian.',
                    },
                    it: {
                      type: 'string',
                      description: 'Text in Italian.',
                    },
                    ja: {
                      type: 'string',
                      description: 'Text in Japanese.',
                    },
                    ko: {
                      type: 'string',
                      description: 'Text in Korean.',
                    },
                    lv: {
                      type: 'string',
                      description: 'Text in Latvian.',
                    },
                    lt: {
                      type: 'string',
                      description: 'Text in Lithuanian.',
                    },
                    ms: {
                      type: 'string',
                      description: 'Text in Malay.',
                    },
                    nb: {
                      type: 'string',
                      description: 'Text in Norwegian.',
                    },
                    pl: {
                      type: 'string',
                      description: 'Text in Polish.',
                    },
                    fa: {
                      type: 'string',
                      description: 'Text in Persian.',
                    },
                    pt: {
                      type: 'string',
                      description: 'Text in Portuguese.',
                    },
                    pa: {
                      type: 'string',
                      description: 'Text in Punjabi.',
                    },
                    ro: {
                      type: 'string',
                      description: 'Text in Romanian.',
                    },
                    ru: {
                      type: 'string',
                      description: 'Text in Russian.',
                    },
                    sr: {
                      type: 'string',
                      description: 'Text in Serbian.',
                    },
                    sk: {
                      type: 'string',
                      description: 'Text in Slovak.',
                    },
                    es: {
                      type: 'string',
                      description: 'Text in Spanish.',
                    },
                    sv: {
                      type: 'string',
                      description: 'Text in Swedish.',
                    },
                    th: {
                      type: 'string',
                      description: 'Text in Thai.',
                    },
                    tr: {
                      type: 'string',
                      description: 'Text in Turkish.',
                    },
                    uk: {
                      type: 'string',
                      description: 'Text in Ukrainian.',
                    },
                    vi: {
                      type: 'string',
                      description: 'Text in Vietnamese.',
                    },
                  },
                },
                {
                  description:
                    'The message\'s title, a map of language codes to text for each language. Each hash must have a language code string for a key, mapped to the localized text you would like users to receive for that language.\nThis field supports inline substitutions.\nExample: {"en": "English Title", "es": "Spanish Title"}\n',
                  writeOnly: true,
                },
              ],
            },
            subtitle: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    en: {
                      type: 'string',
                      description: 'Text in English.  Will be used as a fallback',
                    },
                    ar: {
                      type: 'string',
                      description: 'Text in Arabic.',
                    },
                    bs: {
                      type: 'string',
                      description: 'Text in Bosnian.',
                    },
                    bg: {
                      type: 'string',
                      description: 'Text in Bulgarian.',
                    },
                    ca: {
                      type: 'string',
                      description: 'Text in Catalan.',
                    },
                    'zh-Hans': {
                      type: 'string',
                      description: 'Text in Chinese (Simplified).',
                    },
                    'zh-Hant': {
                      type: 'string',
                      description: 'Text in Chinese (Traditional).',
                    },
                    zh: {
                      type: 'string',
                      description: 'Alias for zh-Hans.',
                    },
                    hr: {
                      type: 'string',
                      description: 'Text in Croatian.',
                    },
                    cs: {
                      type: 'string',
                      description: 'Text in Czech.',
                    },
                    da: {
                      type: 'string',
                      description: 'Text in Danish.',
                    },
                    nl: {
                      type: 'string',
                      description: 'Text in Dutch.',
                    },
                    et: {
                      type: 'string',
                      description: 'Text in Estonian.',
                    },
                    fi: {
                      type: 'string',
                      description: 'Text in Finnish.',
                    },
                    fr: {
                      type: 'string',
                      description: 'Text in French.',
                    },
                    ka: {
                      type: 'string',
                      description: 'Text in Georgian.',
                    },
                    de: {
                      type: 'string',
                      description: 'Text in German.',
                    },
                    el: {
                      type: 'string',
                      description: 'Text in Greek.',
                    },
                    hi: {
                      type: 'string',
                      description: 'Text in Hindi.',
                    },
                    he: {
                      type: 'string',
                      description: 'Text in Hebrew.',
                    },
                    hu: {
                      type: 'string',
                      description: 'Text in Hungarian.',
                    },
                    id: {
                      type: 'string',
                      description: 'Text in Indonesian.',
                    },
                    it: {
                      type: 'string',
                      description: 'Text in Italian.',
                    },
                    ja: {
                      type: 'string',
                      description: 'Text in Japanese.',
                    },
                    ko: {
                      type: 'string',
                      description: 'Text in Korean.',
                    },
                    lv: {
                      type: 'string',
                      description: 'Text in Latvian.',
                    },
                    lt: {
                      type: 'string',
                      description: 'Text in Lithuanian.',
                    },
                    ms: {
                      type: 'string',
                      description: 'Text in Malay.',
                    },
                    nb: {
                      type: 'string',
                      description: 'Text in Norwegian.',
                    },
                    pl: {
                      type: 'string',
                      description: 'Text in Polish.',
                    },
                    fa: {
                      type: 'string',
                      description: 'Text in Persian.',
                    },
                    pt: {
                      type: 'string',
                      description: 'Text in Portuguese.',
                    },
                    pa: {
                      type: 'string',
                      description: 'Text in Punjabi.',
                    },
                    ro: {
                      type: 'string',
                      description: 'Text in Romanian.',
                    },
                    ru: {
                      type: 'string',
                      description: 'Text in Russian.',
                    },
                    sr: {
                      type: 'string',
                      description: 'Text in Serbian.',
                    },
                    sk: {
                      type: 'string',
                      description: 'Text in Slovak.',
                    },
                    es: {
                      type: 'string',
                      description: 'Text in Spanish.',
                    },
                    sv: {
                      type: 'string',
                      description: 'Text in Swedish.',
                    },
                    th: {
                      type: 'string',
                      description: 'Text in Thai.',
                    },
                    tr: {
                      type: 'string',
                      description: 'Text in Turkish.',
                    },
                    uk: {
                      type: 'string',
                      description: 'Text in Ukrainian.',
                    },
                    vi: {
                      type: 'string',
                      description: 'Text in Vietnamese.',
                    },
                  },
                },
                {
                  description:
                    'The message\'s subtitle, a map of language codes to text for each language. Each hash must have a language code string for a key, mapped to the localized text you would like users to receive for that language.\nThis field supports inline substitutions.\nExample: {"en": "English Subtitle", "es": "Spanish Subtitle"}\n',
                  writeOnly: true,
                },
              ],
            },
            data: {
              type: 'object',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\nA custom map of data that is passed back to your app. Same as using Additional Data within the dashboard. Can use up to 2048 bytes of data.\nExample: {"abc": 123, "foo": "bar", "event_performed": true, "amount": 12.1}\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiMsgType: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\nUse "data" or "message" depending on the type of notification you are sending. More details in Data & Background Notifications.\n',
              writeOnly: true,
              nullable: true,
            },
            url: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: All\nThe URL to open in the browser when a user clicks on the notification.\nNote: iOS needs https or updated NSAppTransportSecurity in plist\nThis field supports inline substitutions.\nOmit if including webUrl or appUrl\nExample: https://onesignal.com\n',
              writeOnly: true,
              nullable: true,
            },
            webUrl: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: All Browsers\nSame as url but only sent to web push platforms.\nIncluding Chrome, Firefox, Safari, Opera, etc.\nExample: https://onesignal.com\n',
              writeOnly: true,
              nullable: true,
            },
            appUrl: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: All Browsers\nSame as url but only sent to web push platforms.\nIncluding iOS, Android, macOS, Windows, ChromeApps, etc.\nExample: https://onesignal.com\n',
              writeOnly: true,
              nullable: true,
            },
            iosAttachments: {
              type: 'object',
              description:
                'Channel: Push Notifications\nPlatform: iOS 10+\nAdds media attachments to notifications. Set as JSON object, key as a media id of your choice and the value as a valid local filename or URL. User must press and hold on the notification to view.\nDo not set mutableContent to download attachments. The OneSignal SDK does this automatically\nExample: {"id1": "https://domain.com/image.jpg"}\n',
              writeOnly: true,
              nullable: true,
            },
            templateId: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: All\nUse a template you setup on our dashboard. The templateId is the UUID found in the URL when viewing a template on our dashboard.\nExample: be4a8044-bbd6-11e4-a581-000c2940e62c\n',
              writeOnly: true,
              nullable: true,
            },
            contentAvailable: {
              type: 'boolean',
              description:
                'Channel: Push Notifications\nPlatform: iOS\nSending true wakes your app from background to run custom native code (Apple interprets this as content-available=1). Note: Not applicable if the app is in the "force-quit" state (i.e app was swiped away). Omit the contents field to prevent displaying a visible notification.\n',
              writeOnly: true,
              nullable: true,
            },
            mutableContent: {
              type: 'boolean',
              description:
                'Channel: Push Notifications\nPlatform: iOS 10+\nAlways defaults to true and cannot be turned off. Allows tracking of notification receives and changing of the notification content in your app before it is displayed. Triggers didReceive(_:withContentHandler:) on your UNNotificationServiceExtension.\n',
              writeOnly: true,
            },
            targetContentIdentifier: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS 13+\nUse to target a specific experience in your App Clip, or to target your notification to a specific window in a multi-scene App.\n',
              writeOnly: true,
              nullable: true,
            },
            bigPicture: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\nPicture to display in the expanded view. Can be a drawable resource name or a URL.\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiBigPicture: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\nPicture to display in the expanded view. Can be a drawable resource name or a URL.\n',
              writeOnly: true,
              nullable: true,
            },
            admBigPicture: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Amazon\nPicture to display in the expanded view. Can be a drawable resource name or a URL.\n',
              writeOnly: true,
              nullable: true,
            },
            chromeBigPicture: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: ChromeApp\nLarge picture to display below the notification text. Must be a local URL.\n',
              writeOnly: true,
              nullable: true,
            },
            chromeWebImage: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Chrome 56+\nSets the web push notification's large image to be shown below the notification's title and text. Please see Web Push Notification Icons.\n",
              writeOnly: true,
              nullable: true,
            },
            buttons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  text: {
                    type: 'string',
                  },
                  icon: {
                    type: 'string',
                  },
                },
                required: ['id'],
              },
              description:
                'Channel: Push Notifications\nPlatform: iOS 8.0+, Android 4.1+, and derivatives like Amazon Buttons to add to the notification. Icon only works for Android.\nButtons show in reverse order of array position i.e. Last item in array shows as first button on device.\nExample: [{"id": "id2", "text": "second button", "icon": "ic_menu_share"}, {"id": "id1", "text": "first button", "icon": "ic_menu_send"}]\n',
              writeOnly: true,
              nullable: true,
            },
            webButtons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                  text: {
                    type: 'string',
                  },
                  icon: {
                    type: 'string',
                  },
                },
                required: ['id'],
              },
              description:
                'Channel: Push Notifications\nPlatform: Chrome 48+\nAdd action buttons to the notification. The id field is required.\nExample: [{"id": "like-button", "text": "Like", "icon": "http://i.imgur.com/N8SN8ZS.png", "url": "https://yoursite.com"}, {"id": "read-more-button", "text": "Read more", "icon": "http://i.imgur.com/MIxJp1L.png", "url": "https://yoursite.com"}]\n',
              writeOnly: true,
              nullable: true,
            },
            iosCategory: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS\nCategory APS payload, use with registerUserNotificationSettings:categories in your Objective-C / Swift code.\nExample: calendar category which contains actions like accept and decline\niOS 10+ This will trigger your UNNotificationContentExtension whose ID matches this category.\n',
              writeOnly: true,
              nullable: true,
            },
            androidChannelId: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Android\nThe Android Oreo Notification Category to send the notification under. See the Category documentation on creating one and getting it's id.\n",
              writeOnly: true,
            },
            huaweiChannelId: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Huawei\nThe Android Oreo Notification Category to send the notification under. See the Category documentation on creating one and getting it's id.\n",
              writeOnly: true,
              nullable: true,
            },
            existingAndroidChannelId: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\nUse this if you have client side Android Oreo Channels you have already defined in your app with code.\n',
              writeOnly: true,
            },
            huaweiExistingChannelId: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\nUse this if you have client side Android Oreo Channels you have already defined in your app with code.\n',
              writeOnly: true,
              nullable: true,
            },
            androidBackgroundLayout: {
              type: 'object',
              description:
                'Channel: Push Notifications\nPlatform: Android\nAllowing setting a background image for the notification. This is a JSON object containing the following keys. See our Background Image documentation for image sizes.\n',
              properties: {
                image: {
                  type: 'string',
                  description: 'Asset file, android resource name, or URL to remote image.',
                },
                headingsColor: {
                  type: 'string',
                  description: 'Title text color ARGB Hex format. Example(Blue) "FF0000FF".',
                },
                contentsColor: {
                  type: 'string',
                  description: 'Body text color ARGB Hex format. Example(Red) "FFFF0000".',
                },
              },
              writeOnly: true,
            },
            smallIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\nIcon shown in the status bar and on the top left of the notification.\nIf not set a bell icon will be used or ic_stat_onesignal_default if you have set this resource name.\nSee: How to create small icons\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiSmallIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\nIcon shown in the status bar and on the top left of the notification.\nUse an Android resource path (E.g. /drawable/smallIcon).\nDefaults to your app icon if not set.\n',
              writeOnly: true,
              nullable: true,
            },
            largeIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\nCan be a drawable resource name or a URL.\nSee: How to create large icons\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiLargeIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\nCan be a drawable resource name or a URL.\nSee: How to create large icons\n',
              writeOnly: true,
              nullable: true,
            },
            admSmallIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Amazon\nIf not set a bell icon will be used or ic_stat_onesignal_default if you have set this resource name.\nSee: How to create small icons\n',
              writeOnly: true,
              nullable: true,
            },
            admLargeIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Amazon\nIf blank the smallIcon is used. Can be a drawable resource name or a URL.\nSee: How to create large icons\n',
              writeOnly: true,
              nullable: true,
            },
            chromeWebIcon: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Chrome\nSets the web push notification's icon. An image URL linking to a valid image. Common image types are supported; GIF will not animate. We recommend 256x256 (at least 80x80) to display well on high DPI devices. Firefox will also use this icon, unless you specify firefoxIcon.\n",
              nullable: true,
            },
            chromeWebBadge: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Chrome\nSets the web push notification icon for Android devices in the notification shade. Please see Web Push Notification Badge.\n',
              writeOnly: true,
              nullable: true,
            },
            firefoxIcon: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Firefox\nNot recommended Few people need to set Firefox-specific icons. We recommend setting chromeWebIcon instead, which Firefox will also use.\nSets the web push notification's icon for Firefox. An image URL linking to a valid image. Common image types are supported; GIF will not animate. We recommend 256x256 (at least 80x80) to display well on high DPI devices.\n",
              writeOnly: true,
              nullable: true,
            },
            chromeIcon: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: ChromeApp\nThis flag is not used for web push For web push, please see chromeWebIcon instead.\nThe local URL to an icon to use. If blank, the app icon will be used.\n',
              writeOnly: true,
              nullable: true,
            },
            iosSound: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS\nSound file that is included in your app to play instead of the default device notification sound. Pass nil to disable vibration and sound for the notification.\nExample: "notification.wav"\n',
              writeOnly: true,
              nullable: true,
            },
            androidSound: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\n&#9888;&#65039;Deprecated, this field doesn\'t work on Android 8 (Oreo) and newer devices!\nPlease use Notification Categories / Channels noted above instead to support ALL versions of Android.\nSound file that is included in your app to play instead of the default device notification sound. Pass nil to disable sound for the notification.\nNOTE: Leave off file extension for Android.\nExample: "notification"\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiSound: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\n&#9888;&#65039;Deprecated, this field ONLY works on EMUI 5 (Android 7 based) and older devices.\nPlease also set Notification Categories / Channels noted above to support EMUI 8 (Android 8 based) devices.\nSound file that is included in your app to play instead of the default device notification sound. NOTE: Leave off file extension for and include the full path.\n\nExample: "/res/raw/notification"\n',
              writeOnly: true,
              nullable: true,
            },
            admSound: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Amazon\n&#9888;&#65039;Deprecated, this field doesn\'t work on Android 8 (Oreo) and newer devices!\nPlease use Notification Categories / Channels noted above instead to support ALL versions of Android.\nSound file that is included in your app to play instead of the default device notification sound. Pass nil to disable sound for the notification.\nNOTE: Leave off file extension for Android.\nExample: "notification"\n',
              writeOnly: true,
              nullable: true,
            },
            wpWnsSound: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Windows\nSound file that is included in your app to play instead of the default device notification sound.\nExample: "notification.wav"\n',
              writeOnly: true,
              nullable: true,
            },
            androidLedColor: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\n&#9888;&#65039;Deprecated, this field doesn\'t work on Android 8 (Oreo) and newer devices!\nPlease use Notification Categories / Channels noted above instead to support ALL versions of Android.\nSets the devices LED notification light if the device has one. ARGB Hex format.\nExample(Blue): "FF0000FF"\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiLedColor: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Huawei\n&#9888;&#65039;Deprecated, this field ONLY works on EMUI 5 (Android 7 based) and older devices.\nPlease also set Notification Categories / Channels noted above to support EMUI 8 (Android 8 based) devices.\nSets the devices LED notification light if the device has one. RGB Hex format.\nExample(Blue): "0000FF"\n',
              writeOnly: true,
              nullable: true,
            },
            androidAccentColor: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\nSets the background color of the notification circle to the left of the notification text. Only applies to apps targeting Android API level 21+ on Android 5.0+ devices.\nExample(Red): "FFFF0000"\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiAccentColor: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Huawei\nAccent Color used on Action Buttons and Group overflow count.\nUses RGB Hex value (E.g. #9900FF).\nDefaults to device's theme color if not set.\n",
              writeOnly: true,
              nullable: true,
            },
            androidVisibility: {
              type: 'integer',
              description:
                'Channel: Push Notifications\nPlatform: Android 5.0_\n&#9888;&#65039;Deprecated, this field doesn\'t work on Android 8 (Oreo) and newer devices!\nPlease use Notification Categories / Channels noted above instead to support ALL versions of Android.\n1 = Public (default) (Shows the full message on the lock screen unless the user has disabled all notifications from showing on the lock screen. Please consider the user and mark private if the contents are.)\n0 = Private (Hides message contents on lock screen if the user set "Hide sensitive notification content" in the system settings)\n-1 = Secret (Notification does not show on the lock screen at all)\n',
              writeOnly: true,
              nullable: true,
            },
            huaweiVisibility: {
              type: 'integer',
              nullable: true,
              description:
                'Channel: Push Notifications\nPlatform: Huawei\n&#9888;&#65039;Deprecated, this field ONLY works on EMUI 5 (Android 7 based) and older devices.\nPlease also set Notification Categories / Channels noted above to support EMUI 8 (Android 8 based) devices.\n1 = Public (default) (Shows the full message on the lock screen unless the user has disabled all notifications from showing on the lock screen. Please consider the user and mark private if the contents are.)\n0 = Private (Hides message contents on lock screen if the user set "Hide sensitive notification content" in the system settings)\n-1 = Secret (Notification does not show on the lock screen at all)\n',
              writeOnly: true,
            },
            iosBadgeType: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: iOS\nDescribes whether to set or increase/decrease your app's iOS badge count by the iosBadgeCount specified count. Can specify None, SetTo, or Increase.\n`None` leaves the count unaffected.\n`SetTo` directly sets the badge count to the number specified in iosBadgeCount.\n`Increase` adds the number specified in iosBadgeCount to the total. Use a negative number to decrease the badge count.\n",
              writeOnly: true,
              nullable: true,
            },
            iosBadgeCount: {
              type: 'integer',
              nullable: true,
              description:
                "Channel: Push Notifications\nPlatform: iOS\nUsed with iosBadgeType, describes the value to set or amount to increase/decrease your app's iOS badge count by.\nYou can use a negative number to decrease the badge count when used with an iosBadgeType of Increase.\n",
              writeOnly: true,
            },
            collapseId: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS 10+, Android\nOnly one notification with the same id will be shown on the device. Use the same id to update an existing notification instead of showing a new one. Limit of 64 characters.\n',
              writeOnly: true,
            },
            webPushTopic: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: All Browsers\nDisplay multiple notifications at once with different topics.\n',
              nullable: true,
            },
            apnsAlert: {
              type: 'object',
              description:
                "Channel: Push Notifications\nPlatform: iOS 10+\niOS can localize push notification messages on the client using special parameters such as loc-key. When using the Create Notification endpoint, you must include these parameters inside of a field called apnsAlert. Please see Apple's guide on localizing push notifications to learn more.\n",
              writeOnly: true,
              nullable: true,
            },
            delayedOption: {
              type: 'string',
              description:
                'Channel: All\nPossible values are:\ntimezone (Deliver at a specific time-of-day in each users own timezone)\nlast-active Same as Intelligent Delivery . (Deliver at the same time of day as each user last used your app).\nIf sendAfter is used, this takes effect after the sendAfter time has elapsed.\n',
              writeOnly: true,
              nullable: true,
            },
            deliveryTimeOfDay: {
              type: 'string',
              description: 'Channel: All\nUse with delayedOption=timezone.\nExamples: "9:00AM"\n"21:45"\n"9:45:30"\n',
              writeOnly: true,
              nullable: true,
            },
            ttl: {
              type: 'integer',
              nullable: true,
              description:
                'Channel: Push Notifications\nPlatform: iOS, Android, Chrome, Firefox, Safari, ChromeWeb\nTime To Live - In seconds. The notification will be expired if the device does not come back online within this time. The default is 259,200 seconds (3 days).\nMax value to set is 2419200 seconds (28 days).\n',
              writeOnly: true,
            },
            priority: {
              type: 'integer',
              nullable: true,
              description:
                'Channel: Push Notifications\nPlatform: Android, Chrome, ChromeWeb\nDelivery priority through the push server (example GCM/FCM). Pass 10 for high priority or any other integer for normal priority. Defaults to normal priority for Android and high for iOS. For Android 6.0+ devices setting priority to high will wake the device out of doze mode.\n',
              writeOnly: true,
            },
            apnsPushTypeOverride: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS\nvalid values: voip\nSet the value to voip for sending VoIP Notifications\nThis field maps to the APNS header apns-push-type.\nNote: alert and background are automatically set by OneSignal\n',
              writeOnly: true,
            },
            throttleRatePerMinute: {
              type: 'string',
              description:
                'Channel: All\nApps with throttling enabled:\n  - the parameter value will be used to override the default application throttling value set from the dashboard settings.\n  - parameter value 0 indicates not to apply throttling to the notification.\n  - if the parameter is not passed then the default app throttling value will be applied to the notification.\nApps with throttling disabled:\n  - this parameter can be used to throttle delivery for the notification even though throttling is not enabled at the application level.\nRefer to throttling for more details.\n',
              writeOnly: true,
              nullable: true,
            },
            androidGroup: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Android\nNotifications with the same group will be stacked together using Android's Notification Grouping feature.\n",
              writeOnly: true,
              nullable: true,
            },
            androidGroupMessage: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: Android\nNote: This only works for Android 6 and older. Android 7+ allows full expansion of all message.\nSummary message to display when 2+ notifications are stacked together. Default is "# new messages". Include $[notif_count] in your message and it will be replaced with the current number.\nLanguages - The value of each key is the message that will be sent to users for that language. "en" (English) is required. The key of each hash is either a a 2 character language code or one of zh-Hans/zh-Hant for Simplified or Traditional Chinese. Read more: supported languages.\nExample: {"en": "You have $[notif_count] new messages"}\n',
              writeOnly: true,
              nullable: true,
            },
            admGroup: {
              type: 'string',
              description:
                "Channel: Push Notifications\nPlatform: Amazon\nNotifications with the same group will be stacked together using Android's Notification Grouping feature.\n",
              writeOnly: true,
              nullable: true,
            },
            admGroupMessage: {
              type: 'object',
              description:
                'Channel: Push Notifications\nPlatform: Amazon\nSummary message to display when 2+ notifications are stacked together. Default is "# new messages". Include $[notif_count] in your message and it will be replaced with the current number. "en" (English) is required. The key of each hash is either a a 2 character language code or one of zh-Hans/zh-Hant for Simplified or Traditional Chinese. The value of each key is the message that will be sent to users for that language.\nExample: {"en": "You have $[notif_count] new messages"}\n',
              writeOnly: true,
              nullable: true,
            },
            threadId: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS 12+\nThis parameter is supported in iOS 12 and above. It allows you to group related notifications together.\nIf two notifications have the same thread-id, they will both be added to the same group.\n',
              writeOnly: true,
              nullable: true,
            },
            summaryArg: {
              type: 'string',
              description:
                'Channel: Push Notifications\nPlatform: iOS 12+\nWhen using threadId to create grouped notifications in iOS 12+, you can also control the summary. For example, a grouped notification can say "12 more notifications from John Doe".\nThe summaryArg lets you set the name of the person/thing the notifications are coming from, and will show up as "X more notifications from summaryArg"\n',
              writeOnly: true,
            },
            summaryArgCount: {
              type: 'integer',
              description:
                'Channel: Push Notifications\nPlatform: iOS 12+\nWhen using threadId, you can also control the count of the number of notifications in the group. For example, if the group already has 12 notifications, and you send a new notification with summaryArgCount = 2, the new total will be 14 and the summary will be "14 more notifications from summaryArg"\n',
              writeOnly: true,
            },
            emailSubject: {
              type: 'string',
              description: 'Channel: Email\nRequired.  The subject of the email.\n',
              writeOnly: true,
              nullable: true,
            },
            emailBody: {
              type: 'string',
              description:
                'Channel: Email\nRequired unless templateId is set.\nHTML suported\nThe body of the email you wish to send. Typically, customers include their own HTML templates here. Must include [unsubscribe_url] in an <a> tag somewhere in the email.\nNote: any malformed HTML content will be sent to users. Please double-check your HTML is valid.\n',
              writeOnly: true,
            },
            emailFromName: {
              type: 'string',
              description:
                'Channel: Email\nThe name the email is from. If not specified, will default to "from name" set in the OneSignal Dashboard Email Settings.\n',
              writeOnly: true,
              nullable: true,
            },
            emailFromAddress: {
              type: 'string',
              description:
                'Channel: Email\nThe email address the email is from. If not specified, will default to "from email" set in the OneSignal Dashboard Email Settings.\n',
              writeOnly: true,
              nullable: true,
            },
            emailPreheader: {
              type: 'string',
              description:
                'Channel: Email\nThe preheader text of the email.\nPreheader is the preview text displayed immediately after an email subject that provides additional context about the email content.\nIf not specified, will default to null.\n',
              writeOnly: true,
              nullable: true,
            },
            includeUnsubscribed: {
              type: 'boolean',
              description:
                "Channel: Email\nDefault is `false`. This field is used to send transactional notifications. If set to `true`, this notification will also be sent to unsubscribed emails. If a `templateId` is provided, the `includeUnsubscribed` value from the template will be inherited. If you are using a third-party ESP, this field requires the ESP's list of unsubscribed emails to be cleared.",
              writeOnly: true,
            },
            smsFrom: {
              type: 'string',
              description:
                'Channel: SMS\nPhone Number used to send SMS. Should be a registered Twilio phone number in E.164 format.\n',
              writeOnly: true,
              nullable: true,
            },
            smsMediaUrls: {
              type: 'array',
              items: {
                type: 'string',
              },
              description:
                'Channel: SMS\nURLs for the media files to be attached to the SMS content.\nLimit: 10 media urls with a total max. size of 5MBs.\n',
              writeOnly: true,
              nullable: true,
            },
            filters: {
              type: 'array',
              nullable: true,
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Name of the field to use as the first operand in the filter expression.',
                  },
                  key: {
                    type: 'string',
                    description: 'If `field` is `tag`, this field is *required* to specify `key` inside the tags.',
                  },
                  value: {
                    type: 'string',
                    description:
                      'Constant value to use as the second operand in the filter expression. This value is *required* when the relation operator is a binary operator.',
                  },
                  relation: {
                    type: 'string',
                    description: 'Operator of a filter expression.',
                    enum: ['>', '<', '=', '!=', 'exists', 'not_exists', 'time_elapsed_gt', 'time_elapsed_lt'],
                  },
                },
                required: ['field', 'relation'],
              },
            },
            customData: {
              type: 'object',
              description:
                'Channel: All\nJSON object that can be used as a source of message personalization data for fields that support tag variable substitution.\nPush, SMS: Can accept up to 2048 bytes of valid JSON. Email: Can accept up to 10000 bytes of valid JSON.\nExample: {"order_id": 123, "currency": "USD", "amount": 25}\n',
              writeOnly: true,
              nullable: true,
            },
          },
        },
        {
          required: ['appId'],
        },
      ],
    },
    {
      type: 'object',
      properties: {
        sendAfter: {
          type: 'string',
          format: 'date-time',
          description:
            'Channel: All\nSchedule notification for future delivery. API defaults to UTC -1100\nExamples: All examples are the exact same date & time.\n"Thu Sep 24 2015 14:00:00 GMT-0700 (PDT)"\n"September 24th 2015, 2:00:00 pm UTC-07:00"\n"2015-09-24 14:00:00 GMT-0700"\n"Sept 24 2015 14:00:00 GMT-0700"\n"Thu Sep 24 2015 14:00:00 GMT-0700 (Pacific Daylight Time)"\nNote: SMS currently only supports sendAfter parameter.\n',
          writeOnly: true,
          nullable: true,
        },
      },
    },
  ],
  required: [],
  additionalProperties: true,
} as const satisfies JsonSchema;

export const oneSignalProviderSchema = {
  output: oneSignalOutputSchema,
};
