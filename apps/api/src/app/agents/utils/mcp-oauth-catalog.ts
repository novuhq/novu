import type { AgentRuntimeProviderIdEnum, ClaudeMcpServerOAuthMode } from '@novu/shared';

/**
 * Server-only OAuth metadata for catalog MCP entries.
 *
 * Lives outside `@novu/shared` so the env var names and provider URLs do
 * not ship in the dashboard JS bundle. The dashboard sees only the
 * high-level `oauthMode` hint on `ClaudeMcpServer`.
 *
 * The keys map to `ClaudeMcpServer.id` from `CLAUDE_MCP_SERVERS`.
 */

export type McpOAuthCatalogEntry =
  | { mode: 'none' }
  | {
      mode: 'novu';
      authorizeUrl: string;
      tokenUrl: string;
      refreshUrl?: string;
      scopes: string[];
      clientIdEnvVar: string;
      clientSecretEnvVar: string;
      /** When true, this MCP can also be bound via the provider's vault (e.g. Anthropic Vault). */
      providerVaultSupported?: boolean;
      /**
       * Whether the OAuth provider mandates PKCE for code exchange. When
       * true, `GenerateMcpOAuthUrl` generates a verifier and sends a
       * `code_challenge`; the callback echoes the verifier on token
       * exchange.
       */
      pkceRequired?: boolean;
    }
  | {
      mode: 'provider';
      providerId: AgentRuntimeProviderIdEnum;
    };

export type NovuOAuthCatalogEntry = Extract<McpOAuthCatalogEntry, { mode: 'novu' }>;

/**
 * Populated as we onboard each catalog MCP. Entries not listed here are
 * treated as `{ mode: 'none' }` and surface in the dashboard with no
 * OAuth CTA.
 */
const MCP_OAUTH_CATALOG: Record<string, McpOAuthCatalogEntry> = {};

export function getMcpOAuthCatalogEntry(mcpId: string): McpOAuthCatalogEntry {
  return MCP_OAUTH_CATALOG[mcpId] ?? { mode: 'none' };
}

/**
 * Public hint used by the shared catalog (`ClaudeMcpServer.oauthMode`).
 * Server-side code should call `getMcpOAuthCatalogEntry` directly to get
 * the full configuration; this exposes only the discriminator.
 */
export function getMcpOAuthMode(mcpId: string): ClaudeMcpServerOAuthMode {
  return getMcpOAuthCatalogEntry(mcpId).mode;
}
