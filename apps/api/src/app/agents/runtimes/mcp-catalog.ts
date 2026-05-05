import type { AgentMcpServer, AgentMcpServerAuthType, AgentMcpServerScope } from '@novu/dal';

export interface McpCatalogOauthConfig {
  /**
   * Stable provider key. Phase 4 uses this to read NOVU_MCP_OAUTH_<PROVIDER>_CLIENT_ID
   * and NOVU_MCP_OAUTH_<PROVIDER>_CLIENT_SECRET.
   */
  provider: string;
  /** OAuth 2.0 authorization endpoint. */
  authorizeUrl: string;
  /** OAuth 2.0 token exchange endpoint. */
  tokenUrl: string;
  /** Default scopes requested when the user starts an OAuth flow. */
  scopes?: string[];
  /**
   * How to authenticate the token endpoint request. Anthropic stores this so it can
   * refresh the token later. Most providers support `client_secret_post`.
   */
  tokenEndpointAuthMethod: 'client_secret_basic' | 'client_secret_post';
}

export interface McpCatalogEntry {
  displayName: string;
  url: string;
  authType: AgentMcpServerAuthType;
  scope: AgentMcpServerScope;
  description: string;
  oauth?: McpCatalogOauthConfig;
}

/**
 * Stable list of catalog ids. Adding/removing an entry must be reflected here so
 * the type union keeps the dashboard, validators, and Anthropic mcp_server_name
 * mapping aligned.
 */
export const MCP_CATALOG_IDS = ['github', 'linear', 'notion', 'confluence'] as const;

export type McpCatalogId = (typeof MCP_CATALOG_IDS)[number];

/**
 * Curated registry of MCP servers users can attach to a Claude Managed agent.
 * The id (key here) is reused as Anthropic's mcp_server_name, so this map is the
 * only place URL/scope/auth metadata lives.
 */
export const MCP_CATALOG: Record<McpCatalogId, McpCatalogEntry> = {
  github: {
    displayName: 'GitHub',
    url: 'https://api.githubcopilot.com/mcp/',
    authType: 'oauth',
    scope: 'per_subscriber',
    description: 'Read repositories, issues, and pull requests as the connecting user.',
    oauth: {
      provider: 'github',
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'read:user'],
      tokenEndpointAuthMethod: 'client_secret_post',
    },
  },
  linear: {
    displayName: 'Linear',
    url: 'https://mcp.linear.app/sse',
    authType: 'oauth',
    scope: 'per_subscriber',
    description: 'Search and update Linear issues and projects on behalf of the user.',
    oauth: {
      provider: 'linear',
      authorizeUrl: 'https://linear.app/oauth/authorize',
      tokenUrl: 'https://api.linear.app/oauth/token',
      scopes: ['read', 'write'],
      tokenEndpointAuthMethod: 'client_secret_post',
    },
  },
  notion: {
    displayName: 'Notion',
    url: 'https://mcp.notion.com/sse',
    authType: 'oauth',
    scope: 'per_subscriber',
    description: 'Search the user’s Notion workspace and read accessible pages.',
    oauth: {
      provider: 'notion',
      authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      tokenEndpointAuthMethod: 'client_secret_basic',
    },
  },
  confluence: {
    displayName: 'Confluence',
    url: 'https://mcp.atlassian.com/v1/sse',
    authType: 'static_bearer',
    scope: 'shared',
    description: 'Search the team Confluence space using a shared service token.',
  },
};

/**
 * Snapshot a catalog entry into the persisted shape used on the agent. Stored on
 * the agent so later catalog renames/URL moves don't break already-provisioned
 * Anthropic agents that still reference these names.
 */
export function catalogEntryToAgentMcpServer(id: McpCatalogId): AgentMcpServer {
  const entry = MCP_CATALOG[id];

  return {
    name: id,
    displayName: entry.displayName,
    url: entry.url,
    authType: entry.authType,
    scope: entry.scope,
    oauthProvider: entry.oauth?.provider,
  };
}

export function isMcpCatalogId(value: string): value is McpCatalogId {
  return Object.prototype.hasOwnProperty.call(MCP_CATALOG, value);
}
