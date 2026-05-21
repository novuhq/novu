/**
 * Re-exports the shared OAuth state util from `@novu/application-generic`.
 *
 * The implementation moved to `libs/application-generic/src/oauth/oauth-state.util.ts`
 * so it can be reused by other OAuth flows (e.g. the per-subscriber MCP
 * OAuth callback). This file is preserved as a thin re-export so existing
 * integration callers do not break.
 */
export {
  decodeOAuthStateString,
  encodeOAuthState,
  type OAuthStateParts,
  peekOAuthStatePayload,
  splitOAuthState,
} from '@novu/application-generic';
