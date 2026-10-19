/**
 * Entry point for the `@novu/shared/provider-overrides/slack` subpath.
 *
 * The generated schemas are a few hundred kilobytes, so they must stay off the package barrel and
 * be reached through `await import('@novu/shared/provider-overrides/slack')` instead. Anything that
 * only needs the key inventory should import `./keys`, which stays cheap.
 */
export { SLACK_OVERRIDE_KEYS, SLACK_OVERRIDE_SCHEMA_SUBPATH, SLACK_PRIMARY_CONTENT_KEY } from './keys';
export { slackOverrideJsonSchema } from './slack-override.generated';
export { slackOverrideLiquidTolerantJsonSchema } from './slack-override.liquid-tolerant.generated';
