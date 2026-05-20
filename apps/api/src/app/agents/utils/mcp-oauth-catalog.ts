/**
 * Server-only OAuth policy for catalog MCP entries.
 *
 * Lives outside `@novu/shared` so OAuth allow-list metadata is not shipped in
 * the dashboard JS bundle.
 */
export type McpOAuthCatalogMode = 'none' | 'novu' | 'provider';

/**
 * Server-only OAuth metadata for catalog MCP entries.
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
 * to `{ mode: 'none' }`.
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
 * flow (discovery + per-subscriber DCR).
 *
 * Each entry below has been manually probed and verified to:
 *   1. Advertise its authorization server via Protected Resource Metadata
 *      at `.well-known/oauth-protected-resource` (RFC 9728), and
 *   2. Expose a `registration_endpoint` (RFC 7591) on its AS metadata
 *      (RFC 8414), and
 *   3. Advertise `code_challenge_methods_supported: ["S256"]`.
 *
 * The actual discovery is performed at runtime by `McpOAuthDiscoveryService`;
 * if any upstream removes DCR support, `GenerateMcpOAuthUrl` surfaces a
 * `mcp_no_dcr_support` error on the connection's `lastError`.
 *
 * Keys MUST match an `id` from `MCP_SERVERS`. The alignment is asserted by
 * `mcp-oauth-catalog.spec.ts` at test time.
 *
 * Intentionally NOT on the allow-list (yet):
 *   - slack, github, atlassian-rovo, pagerduty — popular but their AS does
 *     not yet advertise an RFC 7591 `registration_endpoint`; subscribers
 *     would need to pre-register a static client out-of-band.
 *   - box, hubspot, plaid, etc. — pending verification.
 */
const MCP_OAUTH_CATALOG: Record<string, McpOAuthCatalogEntry> = {
  ahrefs: { mode: 'novu' },
  airtable: { mode: 'novu' },
  amplitude: { mode: 'novu' },
  asana: { mode: 'novu' },
  attio: { mode: 'novu' },
  canva: { mode: 'novu' },
  cloudflare: { mode: 'novu' },
  datadog: { mode: 'novu' },
  intercom: { mode: 'novu' },
  linear: { mode: 'novu' },
  mixpanel: { mode: 'novu' },
  neon: { mode: 'novu' },
  notion: { mode: 'novu' },
  sentry: { mode: 'novu' },
  stripe: { mode: 'novu' },
  supabase: { mode: 'novu' },
};

export function getMcpOAuthCatalogEntry(mcpId: string): McpOAuthCatalogEntry {
  return MCP_OAUTH_CATALOG[mcpId] ?? { mode: 'none' };
}

/**
 * Returns the list of MCP ids on the server-side OAuth allow-list. Used by
 * the alignment spec to catch stale allow-list keys that no longer exist in
 * the shared `MCP_SERVERS` catalog (which would otherwise silently rot).
 */
export function getMcpOAuthCatalogIds(): readonly string[] {
  return Object.keys(MCP_OAUTH_CATALOG);
}

/** Returns the OAuth policy mode for a catalog MCP id. */
export function getMcpOAuthMode(mcpId: string): McpOAuthCatalogMode {
  return getMcpOAuthCatalogEntry(mcpId).mode;
}
