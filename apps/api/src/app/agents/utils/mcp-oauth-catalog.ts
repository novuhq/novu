/**
 * Server-only OAuth policy for catalog MCP entries.
 *
 * Lives outside `@novu/shared` so OAuth allow-list metadata is not shipped in
 * the dashboard JS bundle.
 */
export type McpOAuthCatalogMode = 'dcr' | 'novu-app' | 'user-app';

/**
 * Server-only OAuth metadata for catalog MCP entries.
 *
 * Each MCP supports exactly **one** OAuth mode, chosen at catalog-design time
 * based on what its authorization server (AS) advertises. There is no runtime
 * fallback chain — the catalog itself is the source of truth.
 *
 * The three modes:
 *
 * 1. `dcr` — Dynamic Client Registration (RFC 7591). The AS exposes
 *    `.well-known/oauth-protected-resource` (RFC 9728) and a
 *    `registration_endpoint` (RFC 8414). Novu registers a fresh client per
 *    subscriber at authorize-URL time. No static credentials needed.
 *
 * 2. `novu-app` — Novu has a single pre-registered OAuth application with
 *    the upstream MCP. `client_id` / `client_secret` are loaded from server
 *    env vars by the credential resolver service (next PR). Endpoints are
 *    pinned in the catalog because there is no discovery for non-DCR MCPs.
 *
 * 3. `user-app` — Each Novu customer registers their own OAuth application
 *    with the upstream MCP and stores the resulting `client_id` /
 *    `client_secret` in a per-org credential table (next PR). Endpoints are
 *    pinned in the catalog as above.
 *
 * Keys MUST match an `id` from `MCP_SERVERS`. The alignment is asserted by
 * `mcp-oauth-catalog.spec.ts` at test time. Unknown ids are a programming
 * error — `getMcpOAuthCatalogEntry` throws rather than returning a silent
 * default, so a missing catalog entry is caught at the first request instead
 * of rotting in production.
 */

export type DcrOAuthCatalogEntry = {
  mode: 'dcr';
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

export type NovuAppOAuthCatalogEntry = {
  mode: 'novu-app';
  /** Authorization server `issuer` (RFC 8414). Locked in catalog (no discovery). */
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
};

export type UserAppOAuthCatalogEntry = {
  mode: 'user-app';
  /** Authorization server `issuer` (RFC 8414). Locked in catalog (no discovery). */
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
};

export type McpOAuthCatalogEntry = DcrOAuthCatalogEntry | NovuAppOAuthCatalogEntry | UserAppOAuthCatalogEntry;

/**
 * @deprecated Retained as an alias for `DcrOAuthCatalogEntry` while downstream
 * callers transition to the new name. Prefer importing `DcrOAuthCatalogEntry`
 * directly.
 */
export type NovuOAuthCatalogEntry = DcrOAuthCatalogEntry;

/**
 * Catalog of OAuth modes for every entry in `MCP_SERVERS`.
 *
 * Today every entry is `{ mode: 'dcr' }`. `novu-app` and `user-app` are
 * type-defined but have zero entries — the next PR adds them along with the
 * credential resolver service.
 *
 * Each DCR entry below has been manually probed and verified to:
 *   1. Advertise its authorization server via Protected Resource Metadata
 *      at `.well-known/oauth-protected-resource` (RFC 9728), and
 *   2. Expose a `registration_endpoint` (RFC 7591) on its AS metadata
 *      (RFC 8414), and
 *   3. Advertise `code_challenge_methods_supported: ["S256"]`.
 *
 * Discovery happens at runtime in `McpOAuthDiscoveryService`; if any upstream
 * removes DCR support, `GenerateMcpOAuthUrl` surfaces a `mcp_no_dcr_support`
 * error on the connection's `lastError`.
 *
 * MCPs whose AS does not yet advertise an RFC 7591 `registration_endpoint`
 * (slack, github, atlassian-rovo, pagerduty, box, hubspot, plaid, etc.) are
 * intentionally absent — they will be added under `novu-app` or `user-app`
 * in a follow-up PR.
 */
const MCP_OAUTH_CATALOG: Record<string, McpOAuthCatalogEntry> = {
  ahrefs: { mode: 'dcr' },
  airtable: { mode: 'dcr' },
  amplitude: { mode: 'dcr' },
  asana: { mode: 'dcr' },
  attio: { mode: 'dcr' },
  canva: { mode: 'dcr' },
  cloudflare: { mode: 'dcr' },
  datadog: { mode: 'dcr' },
  intercom: { mode: 'dcr' },
  linear: { mode: 'dcr' },
  mixpanel: { mode: 'dcr' },
  neon: { mode: 'dcr' },
  notion: { mode: 'dcr' },
  sentry: { mode: 'dcr' },
  stripe: { mode: 'dcr' },
  supabase: { mode: 'dcr' },
};

/**
 * Returns the catalog OAuth entry for an MCP id. Throws when the id has no
 * entry — every MCP in `MCP_SERVERS` must have one, and the alignment spec
 * asserts this invariant at test time.
 */
export function getMcpOAuthCatalogEntry(mcpId: string): McpOAuthCatalogEntry {
  const entry = MCP_OAUTH_CATALOG[mcpId];

  if (!entry) {
    throw new Error(`No MCP OAuth catalog entry for "${mcpId}". Add it to MCP_OAUTH_CATALOG.`);
  }

  return entry;
}

/**
 * Returns the list of MCP ids on the server-side OAuth catalog. Used by the
 * alignment spec to catch stale catalog keys that no longer exist in the
 * shared `MCP_SERVERS` catalog (which would otherwise silently rot).
 */
export function getMcpOAuthCatalogIds(): readonly string[] {
  return Object.keys(MCP_OAUTH_CATALOG);
}

/** Returns the OAuth mode for a catalog MCP id. Throws on unknown ids. */
export function getMcpOAuthMode(mcpId: string): McpOAuthCatalogMode {
  return getMcpOAuthCatalogEntry(mcpId).mode;
}
