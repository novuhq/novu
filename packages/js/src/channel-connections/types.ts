import type { Context } from '../types';

export type ChannelConnectionResponse = {
  identifier: string;
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
  /** Slack only: user-level OAuth scopes (e.g. identity.basic). */
  userScope?: string[];
};

export type ListChannelConnectionsArgs = {
  subscriberId?: string;
  integrationIdentifier?: string;
  channel?: string;
  providerId?: string;
  contextKeys?: string[];
  limit?: number;
  after?: string;
  before?: string;
};

export type GetChannelConnectionArgs = {
  identifier: string;
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
