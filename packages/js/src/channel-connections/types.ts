import type { Context } from '../types';

export type ChannelConnectionResponse = {
  identifier: string;
  /** The provider workspace/team this connection is bound to. */
  workspace?: { id: string; name?: string; botUserId?: string };
  /** ISO timestamp of when the connection was created. */
  createdAt?: string;
};

export type ChannelEndpointResponse = {
  identifier: string;
  type: string;
};

export type OAuthMode = 'connect' | 'link_user';

export type ConnectionMode = 'subscriber' | 'shared';

/**
 * @deprecated Use GenerateConnectOAuthUrlArgs or GenerateLinkUserOAuthUrlArgs instead.
 */
export type GenerateChatOAuthUrlArgs = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
  context?: Context;
  scope?: string[];
  userScope?: string[];
  mode?: OAuthMode;
  connectionMode?: ConnectionMode;
  autoLinkUser?: boolean;
};

/** Args for creating a workspace/tenant channel connection (Slack install or MS Teams admin consent). */
export type GenerateConnectOAuthUrlArgs = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
  context?: Context;
  /**
   * HMAC-SHA256 of the canonicalized `context`, signed with the tenant environment
   * secret key (same "Inbox with context" signing). Required when connecting to a
   * `restricted` agent and the session did not already verify the context.
   */
  contextHash?: string;
  /** Slack only: OAuth bot scopes to request. */
  scope?: string[];
  connectionMode?: ConnectionMode;
  autoLinkUser?: boolean;
};

/** Args for linking a subscriber to their personal chat identity (Slack user or MS Teams user OID). */
export type GenerateLinkUserOAuthUrlArgs = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  /** Required — this operation always binds a specific subscriber to a user identity. */
  subscriberId: string;
  context?: Context;
  /**
   * HMAC-SHA256 of the canonicalized `context`, signed with the tenant environment
   * secret key. Required when linking to a `restricted` agent and the session did
   * not already verify the context, so the per-user link carries a trustworthy binding.
   */
  contextHash?: string;
  /** Slack only: user-level OAuth scopes (e.g. identity.basic). */
  userScope?: string[];
};

export type ListChannelConnectionsArgs = {
  subscriberId?: string;
  integrationIdentifier?: string;
  channel?: string;
  providerId?: string;
  contextKeys?: string[];
  /**
   * Scope results relative to the subscriber. `subscriber` returns only the
   * subscriber's own connections, `shared` returns only shared (workspace-level)
   * connections. Omit to return both.
   */
  connectionMode?: ConnectionMode;
  limit?: number;
  after?: string;
  before?: string;
};

export type GetChannelConnectionArgs = {
  identifier: string;
  connectionMode?: ConnectionMode;
};

export type CreateChannelConnectionArgs = {
  identifier?: string;
  integrationIdentifier: string;
  subscriberId?: string;
  context?: Context;
  workspace: { id: string; name?: string };
  auth: { accessToken: string };
};

export type DeleteChannelConnectionArgs = {
  identifier: string;
};

export type ListChannelEndpointsArgs = {
  subscriberId?: string;
  integrationIdentifier?: string;
  connectionIdentifier?: string;
  channel?: string;
  providerId?: string;
  contextKeys?: string[];
  limit?: number;
  after?: string;
  before?: string;
};

export type GetChannelEndpointArgs = {
  identifier: string;
};

export type CreateChannelEndpointArgs = {
  identifier?: string;
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId: string;
  context?: Context;
  type: string;
  endpoint: Record<string, string>;
};

export type DeleteChannelEndpointArgs = {
  identifier: string;
};

/**
 * Args for issuing a provider-specific URL the subscriber opens to link their
 * chat identity (e.g. a Telegram `t.me` deep link). The subscriber is derived
 * from the session token, so only the integration identifier is required.
 */
export type LinkChannelEndpointArgs = {
  integrationIdentifier: string;
  /**
   * Context bound to the resulting channel endpoint at link time.
   */
  context?: Context;
};

export type LinkChannelEndpointResponse = {
  /** URL the subscriber opens to link their chat identity (deep link or OAuth URL). */
  url: string;
  /** Provider-specific metadata returned alongside the link URL (e.g. Telegram `botUsername`, `expiresAt`). */
  providerMetadata?: Record<string, unknown>;
};
