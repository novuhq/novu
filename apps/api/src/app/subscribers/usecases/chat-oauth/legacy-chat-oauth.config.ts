/**
 * Operating mode for the deprecated per-subscriber chat OAuth endpoints
 * (`GET /v1/subscribers/:subscriberId/credentials/:providerId/oauth[/callback]`).
 *
 * Those two routes are unauthenticated by design — they are opened in the
 * subscriber's browser and hit again by the provider's redirect — so the only
 * proof of authorization they can carry is the subscriber HMAC hash, which is
 * opt-in per integration. `enabled` preserves that historical behavior;
 * operators that have migrated to `POST /v1/integrations/chat/oauth` should
 * move to `hmac_required` and then `disabled`.
 */
export enum LegacyChatOauthMode {
  /** Historical behavior: HMAC enforced only when the integration opts in. */
  ENABLED = 'enabled',
  /** HMAC always enforced, regardless of the integration's `hmac` credential. */
  HMAC_REQUIRED = 'hmac_required',
  /** Both routes reject every request. */
  DISABLED = 'disabled',
}

export const LEGACY_CHAT_OAUTH_MODE_ENV_VAR = 'NOVU_LEGACY_SUBSCRIBER_CHAT_OAUTH';

export const LEGACY_CHAT_OAUTH_MIGRATION_HINT =
  'The per-subscriber chat OAuth endpoints are deprecated. Use POST /v1/integrations/chat/oauth to mint an ' +
  'authenticated OAuth URL instead.';

const VALID_MODES = new Set<string>(Object.values(LegacyChatOauthMode));

export function getLegacyChatOauthMode(): LegacyChatOauthMode {
  const configured = process.env[LEGACY_CHAT_OAUTH_MODE_ENV_VAR]?.trim().toLowerCase();

  if (!configured) {
    return LegacyChatOauthMode.ENABLED;
  }

  // Falling back to the permissive default keeps a typo from taking a working
  // integration offline. Both endpoints log the resolved mode on every call, so
  // a misconfiguration still shows up as `mode: enabled` in the request logs.
  if (!VALID_MODES.has(configured)) {
    return LegacyChatOauthMode.ENABLED;
  }

  return configured as LegacyChatOauthMode;
}
