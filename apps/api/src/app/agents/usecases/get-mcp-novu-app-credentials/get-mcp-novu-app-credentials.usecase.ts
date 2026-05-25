import { Injectable } from '@nestjs/common';

import { McpOAuthDiscoveryError } from '../../services/mcp-oauth-discovery.service';

export interface NovuAppCredentials {
  clientId: string;
  clientSecret: string;
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
 * when either env var is unset or empty so the caller can map it onto
 * `mcp_connection.lastError.code` instead of leaking a 500.
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
}
