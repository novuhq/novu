/**
 * Hand-written twin of the generated FCM schema's top-level shape, so key-level validation and
 * the provider registry never have to pull the generated artifact into a bundle.
 * `fcm-override.drift.spec.ts` fails if these drift apart.
 *
 * Order matches firebase-admin `BaseMessage` property declaration order (what the generator emits).
 */
export const FCM_OVERRIDE_KEYS = ['data', 'notification', 'android', 'webpush', 'apns', 'fcmOptions'] as const;

/**
 * Excluded from the generated FCM override schema / editor autocomplete only. These keys are
 * resolved from Novu's subscriber routing at send time; omitting them from the schema keeps
 * autocomplete from suggesting them, but overrides may still set them (typed or `_passthrough`)
 * and they are not stripped on the send path.
 *
 * `BaseMessage` itself does not declare them — they live on `TokenMessage` / `TopicMessage` /
 * `ConditionMessage` / `MulticastMessage` — but listing them here documents the product rule and
 * feeds `assertRoutingKeysAreAbsent`.
 */
export const NON_OVERRIDABLE_FCM_KEYS = ['token', 'tokens', 'topic', 'condition'] as const;

/** FCM puts the compiled step body into `notification.body`. */
export const FCM_PRIMARY_CONTENT_KEY = 'notification.body';

/** Package subpath the full generated FCM schema ships behind. */
export const FCM_OVERRIDE_SCHEMA_SUBPATH = '@novu/shared/provider-overrides/fcm';
