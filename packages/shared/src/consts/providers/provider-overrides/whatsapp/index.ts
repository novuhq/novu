/**
 * Entry point for the `@novu/shared/provider-overrides/whatsapp` subpath.
 *
 * The generated schemas pull in nested Cloud API definitions (template components, interactive
 * actions, …), so they must stay off the package barrel and be reached through
 * `await import('@novu/shared/provider-overrides/whatsapp')` instead. Anything that only needs the
 * key inventory should import `./keys`, which stays cheap.
 */
export {
  NON_OVERRIDABLE_WHATSAPP_KEYS,
  WHATSAPP_OVERRIDE_KEYS,
  WHATSAPP_OVERRIDE_SCHEMA_SUBPATH,
  WHATSAPP_PRIMARY_CONTENT_KEY,
} from './keys';
export { whatsappOverrideJsonSchema } from './whatsapp-override.generated';
export { whatsappOverrideLiquidTolerantJsonSchema } from './whatsapp-override.liquid-tolerant.generated';
