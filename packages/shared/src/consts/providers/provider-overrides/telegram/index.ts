/**
 * Entry point for the `@novu/shared/provider-overrides/telegram` subpath.
 *
 * The generated schemas pull in nested Bot API definitions (reply_markup, MessageEntity, …), so
 * they must stay off the package barrel and be reached through
 * `await import('@novu/shared/provider-overrides/telegram')` instead. Anything that only needs the
 * key inventory should import `./keys`, which stays cheap.
 */
export { TELEGRAM_OVERRIDE_KEYS, TELEGRAM_OVERRIDE_SCHEMA_SUBPATH, TELEGRAM_PRIMARY_CONTENT_KEY } from './keys';
export { telegramOverrideJsonSchema } from './telegram-override.generated';
export { telegramOverrideLiquidTolerantJsonSchema } from './telegram-override.liquid-tolerant.generated';
