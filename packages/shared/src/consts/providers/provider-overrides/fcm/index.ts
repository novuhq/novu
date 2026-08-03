/**
 * Entry point for the `@novu/shared/provider-overrides/fcm` subpath.
 *
 * The generated schemas pull in nested Android / APNs / Webpush definitions, so they must stay
 * off the package barrel and be reached through
 * `await import('@novu/shared/provider-overrides/fcm')` instead. Anything that only needs the
 * key inventory should import `./keys`, which stays cheap.
 */

export { fcmOverrideJsonSchema } from './fcm-override.generated';
export { fcmOverrideLiquidTolerantJsonSchema } from './fcm-override.liquid-tolerant.generated';
export { FCM_OVERRIDE_KEYS, FCM_OVERRIDE_SCHEMA_SUBPATH, FCM_PRIMARY_CONTENT_KEY } from './keys';
