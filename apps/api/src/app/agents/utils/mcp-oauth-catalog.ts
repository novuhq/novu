import type { McpServerOAuthMode } from '@novu/shared';

/**
 * Server-only OAuth metadata for catalog MCP entries.
 *
 * Lives outside `@novu/shared` so we can carry server-only OAuth policy hints
 * without shipping them in the dashboard JS bundle. The dashboard sees only
 * the high-level `oauthMode` discriminator on `McpServer`.
 *
 * After the MCP-spec OAuth refactor this catalog is a thin **allow-list**:
 * the actual OAuth endpoints, scopes, registration endpoint, and issuer are
 * all discovered at runtime from the MCP server's
 * `.well-known/oauth-protected-resource` document (RFC 9728) and the
 * authorization server's metadata (RFC 8414 / OIDC Discovery). Client
 * credentials are obtained per-subscriber via Dynamic Client Registration
 * (RFC 7591); no env-var-based pre-registered clients are configured here.
 *
 * Keys map to `McpServer.id` from `MCP_SERVERS`. Entries not listed default
 * to `{ mode: 'none' }` and surface in the dashboard with no Authorize CTA.
 */

export type McpOAuthCatalogEntry =
  | { mode: 'none' }
  | {
      mode: 'novu';
      /**
       * OIDC Dynamic Client Registration `application_type`. Defaults to
       * `'web'` since Novu redirects through a hosted callback URL.
       */
      applicationType?: 'web' | 'native';
      /**
       * RFC 7591 `software_id` sent at registration time. Lets the upstream
       * MCP attribute registrations to Novu in its logs without affecting
       * the auth flow. Defaults to `'novu-mcp-client'`.
       */
      softwareId?: string;
    };

export type NovuOAuthCatalogEntry = Extract<McpOAuthCatalogEntry, { mode: 'novu' }>;

/**
 * Allow-list of MCPs where Novu performs the spec-compliant managed OAuth
 * flow (discovery + per-subscriber DCR). Add new entries here as upstream
 * MCP servers are verified to advertise `registration_endpoint` and
 * `code_challenge_methods_supported: ["S256"]` in their AS metadata.
 */
const MCP_OAUTH_CATALOG: Record<string, McpOAuthCatalogEntry> = {
  sentry: { mode: 'novu' },
  linear: { mode: 'novu' },
};

export function getMcpOAuthCatalogEntry(mcpId: string): McpOAuthCatalogEntry {
  return MCP_OAUTH_CATALOG[mcpId] ?? { mode: 'none' };
}

/**
 * Public hint used by the shared catalog (`McpServer.oauthMode`).
 * Server-side code should call `getMcpOAuthCatalogEntry` directly to get
 * the full configuration; this exposes only the discriminator.
 */
export function getMcpOAuthMode(mcpId: string): McpServerOAuthMode {
  return getMcpOAuthCatalogEntry(mcpId).mode;
}
