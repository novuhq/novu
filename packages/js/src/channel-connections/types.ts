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

export type GenerateChatOAuthUrlArgs = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
  context?: Context;
  scope?: string[];
  userScope?: string[];
  mode?: OAuthMode;
  connectionMode?: ConnectionMode;
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
