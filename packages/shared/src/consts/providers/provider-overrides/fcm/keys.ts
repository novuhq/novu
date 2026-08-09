/**
 * Hand-written twin of the generated FCM schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the generated artifact into a bundle.
 * `fcm-override.drift.spec.ts` fails if these drift apart.
 *
 * `FCM_ROUTING_KEYS` order is send-plan / claim precedence (see `resolveExclusiveRoutingKeys`).
 * It must also match the routing-key prefix of `Object.keys(fcmOverrideJsonSchema.properties)`.
 */

/**
 * At most one of these may appear in a single FCM content override.
 * Precedence: token > topic > condition > tokens.
 * Topic is claimed before tokens so a layer that sets both keeps the legacy topic send path.
 */
export const FCM_ROUTING_KEYS = ['token', 'topic', 'condition', 'tokens'] as const;

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
