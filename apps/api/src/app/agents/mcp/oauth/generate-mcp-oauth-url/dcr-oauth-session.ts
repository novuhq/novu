import { isIP } from 'node:net';
import { decryptMcpConnectionOAuthClient, isPrivateIp } from '@novu/application-generic';
import { McpConnectionEntity, McpConnectionOAuthClient } from '@novu/dal';
import { McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';

import { buildMcpOAuthRedirectUri } from './mcp-oauth-state';
import { pickReusableOAuthClient } from './pick-reusable-oauth-client';

/** Whether two scope lists are equal (order-independent). */
export function scopesMatch(stored: string[] | undefined, requested: string[]): boolean {
  if (requested.length === 0) {
    return !stored || stored.length === 0;
  }

  if (!stored || stored.length !== requested.length) {
    return false;
  }

  const storedSet = new Set(stored);

  return requested.every((scope) => storedSet.has(scope));
}

/**
 * Rotate a pending DCR session when the catalog pins scopes but the stored
 * client was registered against the full PRM superset (e.g. PostHog).
 */
export function shouldRotatePendingOAuthSessionForCatalogScopes(
  existing: McpConnectionEntity | null,
  catalogScopes?: string[]
): boolean {
  if (!catalogScopes?.length || !existing?.oauthClient) {
    return false;
  }

  const client = decryptMcpConnectionOAuthClient(existing.oauthClient);
  const storedScopes = client.scopesGranted;

  if (!storedScopes?.length) {
    return true;
  }

  return !scopesMatch(storedScopes, catalogScopes);
}

export function resolveDcrAuthorizeScopes(
  catalogScopes: string[] | undefined,
  oauthClient: McpConnectionOAuthClient
): string[] {
  if (catalogScopes?.length) {
    return catalogScopes;
  }

  return oauthClient.scopesGranted ?? [];
}

/**
 * RFC 7591 optional client metadata. Some ASes (e.g. Make) reject
 * `client_uri` / `logo_uri` when the hostname is localhost or otherwise
 * not publicly routable — omit the fields rather than fail registration.
 */
export function resolveDcrClientMetadataUris(frontBase: string | undefined): {
  client_uri?: string;
  logo_uri?: string;
} {
  if (!frontBase || !isPublicDcrClientMetadataBase(frontBase)) {
    return {};
  }

  return {
    client_uri: frontBase,
    logo_uri: `${frontBase}/images/novu.svg`,
  };
}

function isPublicDcrClientMetadataBase(base: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return false;
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');

  if (host === 'localhost' || host.endsWith('.localhost')) {
    return false;
  }

  if (isIP(host) !== 0 && isPrivateIp(host)) {
    return false;
  }

  return true;
}

/**
 * Decide whether a `pending_oauth` session can be reused without rotating PKCE.
 * For DCR the recorded client is validated through `pickReusableOAuthClient`
 * (issuer match, unexpired secret, and matching redirect URI); for `novu-app`
 * the pinned endpoints recorded on the session are sufficient.
 */
export function canReusePendingOAuthSession(existing: McpConnectionEntity | null): boolean {
  if (!existing) {
    return false;
  }

  if (existing.status !== McpConnectionStatusEnum.PendingOAuth) {
    return false;
  }

  const oauthState = existing.oauthState;

  if (!oauthState?.pkceVerifier || oauthState.callbackClaimedAt) {
    return false;
  }

  if (existing.authMode === McpConnectionAuthModeEnum.NovuApp) {
    return Boolean(
      oauthState.expectedIssuer && oauthState.resource && oauthState.tokenEndpoint && oauthState.authorizationEndpoint
    );
  }

  if (existing.authMode === McpConnectionAuthModeEnum.Dcr) {
    return Boolean(
      oauthState.expectedIssuer &&
        oauthState.resource &&
        pickReusableOAuthClient(existing.oauthClient, oauthState.expectedIssuer, buildMcpOAuthRedirectUri())
    );
  }

  return false;
}
