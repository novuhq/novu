import { Injectable } from '@nestjs/common';
import { MCP_SERVERS, McpConnectionAuthModeEnum } from '@novu/shared';

import { McpOAuthDiscoveryError } from '../../services/mcp-oauth-discovery.service';

export interface NovuAppCredentials {
  clientId: string;
  clientSecret: string;
  /**
   * Public GitHub App slug (e.g. `novu-mcp`) resolved when the catalog
   * declares an `installation.appSlugEnv`. Absent for novu-app entries
   * that use the classic OAuth-app flow without installation gating.
   */
  appSlug?: string;
}

/**
 * Per-MCP env-var mapping for `authMode === 'novu-app'` connections. Adding
 * a new entry here is the second half of onboarding a `novu-app` MCP
 * (the first being the catalog `oauth` block in `MCP_SERVERS`).
 *
 * Keys MUST match `McpServer.id` values. Both env vars MUST be set in every
 * environment that should be able to complete the OAuth flow; missing
 * values surface as `mcp_novu_app_credentials_missing` on the connection's
 * `lastError.code` so the dashboard can render "Coming soon" copy instead
 * of silently 500-ing the picker.
 *
 * Some entries also use the catalog `installation` block to declare an
 * `appSlugEnv` that resolves to a GitHub-App slug; that env var is read by
 * `executeAppSlug` below, NOT this map (the slug isn't a secret, lives on
 * the catalog as a contract, and only its VALUE is environment-specific).
 */
const CRED_ENV_MAP: Record<string, { clientIdEnv: string; clientSecretEnv: string }> = {
  github: {
    clientIdEnv: 'NOVU_GITHUB_MCP_APP_CLIENT_ID',
    clientSecretEnv: 'NOVU_GITHUB_MCP_APP_CLIENT_SECRET',
  },
};

/**
 * Resolve the Novu-managed OAuth app credentials for a given catalog MCP id.
 * Mirrors the env-loaded pattern of `GetNovuProviderCredentials`
 * (notifications providers) so self-hosters can BYO credentials by setting
 * the documented env vars without code changes.
 *
 * Throws `McpOAuthDiscoveryError('mcp_novu_app_credentials_missing', …)`
 * when either the env vars or the catalog-declared app slug are unset or
 * empty so the caller can map it onto `mcp_connection.lastError.code`
 * instead of leaking a 500.
 */
@Injectable()
export class GetMcpNovuAppCredentials {
  execute(mcpId: string): NovuAppCredentials {
    const mapping = CRED_ENV_MAP[mcpId];

    if (!mapping) {
      throw new McpOAuthDiscoveryError(
        'mcp_novu_app_credentials_missing',
        `No novu-app credential mapping configured for MCP "${mcpId}".`
      );
    }

    // Trim before the presence check so whitespace-only values (a common
    // shell/.env footgun) are treated as "missing" rather than passed
    // through as garbage `client_id` / `client_secret` to the token endpoint.
    const clientId = process.env[mapping.clientIdEnv]?.trim();
    const clientSecret = process.env[mapping.clientSecretEnv]?.trim();

    if (!clientId || !clientSecret) {
      const missing = [clientId ? null : mapping.clientIdEnv, clientSecret ? null : mapping.clientSecretEnv].filter(
        (entry): entry is string => entry !== null
      );

      throw new McpOAuthDiscoveryError(
        'mcp_novu_app_credentials_missing',
        `Novu OAuth app credentials missing for MCP "${mcpId}": ${missing.join(', ')}.`
      );
    }

    return { clientId, clientSecret };
  }

  /**
   * Resolve the GitHub App public slug (e.g. `novu-mcp`) for a catalog
   * entry that uses the "App + Installation" flow. The env-var NAME is
   * declared on the catalog's `oauth.installation.appSlugEnv`; only its
   * VALUE is environment-specific so self-hosters can BYO App.
   *
   * Throws `McpOAuthDiscoveryError('mcp_novu_app_credentials_missing', ...)`
   * when either the catalog entry doesn't declare an installation block or
   * the named env var is unset/empty. Same error code as the client_id
   * /secret path so the existing dashboard mapping renders uniform copy.
   */
  executeAppSlug(mcpId: string): string {
    const catalog = MCP_SERVERS.find((entry) => entry.id === mcpId);
    if (!catalog?.oauth || catalog.oauth.mode !== McpConnectionAuthModeEnum.NovuApp) {
      throw new McpOAuthDiscoveryError(
        'mcp_novu_app_credentials_missing',
        `MCP "${mcpId}" is not a novu-app entry; no app slug to resolve.`
      );
    }

    const slugEnvName = catalog.oauth.installation?.appSlugEnv;
    if (!slugEnvName) {
      throw new McpOAuthDiscoveryError(
        'mcp_novu_app_credentials_missing',
        `MCP "${mcpId}" novu-app entry does not declare an installation block; no app slug to resolve.`
      );
    }

    const slug = process.env[slugEnvName]?.trim();
    if (!slug) {
      throw new McpOAuthDiscoveryError(
        'mcp_novu_app_credentials_missing',
        `Novu OAuth app slug missing for MCP "${mcpId}": ${slugEnvName}.`
      );
    }

    return slug;
  }
}
