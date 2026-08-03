/**
 * Hand-written twin of the generated FCM schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the generated artifact into a bundle.
 * `fcm-override.drift.spec.ts` fails if these drift apart.
 *
 * Order matches the generator's property emission order exactly
 * (`Object.keys(fcmOverrideJsonSchema.properties)`).
 */

/** At most one of these may appear in a single FCM content override. */
export const FCM_ROUTING_KEYS = ['token', 'tokens', 'topic', 'condition'] as const;

export const FCM_OVERRIDE_KEYS = [
  ...FCM_ROUTING_KEYS,
  'data',
  'notification',
  'android',
  'webpush',
  'apns',
  'fcmOptions',
] as const;

/** FCM puts the compiled step body into `notification.body`. */
export const FCM_PRIMARY_CONTENT_KEY = 'notification.body';

/** Package subpath the full generated FCM schema ships behind. */
export const FCM_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/fcm';
