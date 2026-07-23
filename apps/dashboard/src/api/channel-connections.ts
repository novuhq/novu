import type { IEnvironment } from '@novu/shared';
import { get, patch, post } from './api.client';

/** Write-only: a refresh token is a single-use secret, only ever sent, never returned. */
export type ChannelConnectionAuthRequestDto = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
};

/** The API never echoes back a stored refresh token — only whether one is configured. */
export type ChannelConnectionAuthResponseDto = {
  accessToken: string;
  hasRefreshToken: boolean;
  expiresAt?: string;
  refreshTokenExpiresAt?: string;
};

export type ChannelConnectionWorkspaceDto = {
  id: string;
  name?: string;
};

export type ChannelConnectionDto = {
  identifier: string;
  channel: string | null;
  providerId: string | null;
  integrationIdentifier: string | null;
  subscriberId: string | null;
  contextKeys: string[];
  workspace?: ChannelConnectionWorkspaceDto;
  auth?: ChannelConnectionAuthResponseDto;
  createdAt: string;
  updatedAt: string;
};

export type ChannelConnectionsListResponse = {
  data: ChannelConnectionDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

type ListChannelConnectionsParams = {
  environment: IEnvironment;
  subscriberId?: string;
  channel?: string;
  integrationIdentifier?: string;
  limit?: number;
  signal?: AbortSignal;
};

export function listChannelConnections({
  environment,
  subscriberId,
  channel,
  integrationIdentifier,
  limit = 100,
  signal,
}: ListChannelConnectionsParams): Promise<ChannelConnectionsListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('limit', limit.toString());

  if (subscriberId) {
    searchParams.append('subscriberId', subscriberId);
  }

  if (channel) {
    searchParams.append('channel', channel);
  }

  if (integrationIdentifier) {
    searchParams.append('integrationIdentifier', integrationIdentifier);
  }

  return get<ChannelConnectionsListResponse>(`/channel-connections?${searchParams.toString()}`, {
    environment,
    signal,
  });
}

type ChannelConnectionApiEnvelope = { data: ChannelConnectionDto };

export async function retrieveChannelConnection({
  identifier,
  environment,
  signal,
}: {
  identifier: string;
  environment: IEnvironment;
  signal?: AbortSignal;
}): Promise<ChannelConnectionDto> {
  const response = await get<ChannelConnectionApiEnvelope>(`/channel-connections/${encodeURIComponent(identifier)}`, {
    environment,
    signal,
  });

  return response.data;
}

export async function updateChannelConnection({
  identifier,
  environment,
  workspace,
  auth,
}: {
  identifier: string;
  environment: IEnvironment;
  workspace: ChannelConnectionWorkspaceDto;
  auth: ChannelConnectionAuthRequestDto;
}): Promise<ChannelConnectionDto> {
  const response = await patch<ChannelConnectionApiEnvelope>(`/channel-connections/${encodeURIComponent(identifier)}`, {
    environment,
    body: { workspace, auth },
  });

  return response.data;
}

/**
 * Forces an immediate check (and, for rotating providers, exchange) of the connection's
 * stored auth against the provider. Used right after saving a pasted refresh token so an
 * invalid or already-used token surfaces an error immediately instead of only being
 * discovered on the next real send.
 */
export async function verifyChannelConnection({
  identifier,
  environment,
}: {
  identifier: string;
  environment: IEnvironment;
}): Promise<ChannelConnectionDto> {
  const response = await post<ChannelConnectionApiEnvelope>(
    `/channel-connections/${encodeURIComponent(identifier)}/verify`,
    {
      environment,
    }
  );

  return response.data;
}
