import type { ChannelEndpointByType, ChannelEndpointType, IEnvironment } from '@novu/shared';
import { del, get, patch, post } from './api.client';

export type ChannelEndpointPayload = ChannelEndpointByType[ChannelEndpointType];

export type ChannelEndpointDto = {
  identifier: string;
  channel: string | null;
  providerId: string | null;
  integrationIdentifier: string | null;
  /** Set when the endpoint was created through an OAuth connect flow (connect button), null for bot-DM auto-provision. */
  connectionIdentifier: string | null;
  /** Subscriber the endpoint is linked to. Dashboard onboarding uses a `connect:` prefixed id. */
  subscriberId: string | null;
  contextKeys: string[];
  type: ChannelEndpointType;
  endpoint: ChannelEndpointPayload;
  createdAt: string;
  updatedAt: string;
};

export type ChannelEndpointsListResponse = {
  data: ChannelEndpointDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

type ListChannelEndpointsParams = {
  environment: IEnvironment;
  subscriberId?: string;
  channel?: string;
  integrationIdentifier?: string;
  limit?: number;
  signal?: AbortSignal;
};

export function listChannelEndpoints({
  environment,
  subscriberId,
  channel,
  integrationIdentifier,
  limit = 100,
  signal,
}: ListChannelEndpointsParams): Promise<ChannelEndpointsListResponse> {
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

  return get<ChannelEndpointsListResponse>(`/channel-endpoints?${searchParams.toString()}`, {
    environment,
    signal,
  });
}

type CreateChannelEndpointParams = {
  environment: IEnvironment;
  subscriberId: string;
  integrationIdentifier: string;
  connectionIdentifier?: string;
  type: ChannelEndpointType;
  endpoint: ChannelEndpointPayload;
};

export function createChannelEndpoint({
  environment,
  subscriberId,
  integrationIdentifier,
  connectionIdentifier,
  type,
  endpoint,
}: CreateChannelEndpointParams): Promise<ChannelEndpointDto> {
  const body = {
    subscriberId,
    integrationIdentifier,
    type,
    endpoint,
    ...(connectionIdentifier ? { connectionIdentifier } : {}),
  };

  return post<ChannelEndpointDto>('/channel-endpoints', { environment, body });
}

type UpdateChannelEndpointParams = {
  environment: IEnvironment;
  /** Only used for cache invalidation, not sent to the API. */
  subscriberId: string;
  identifier: string;
  endpoint: ChannelEndpointPayload;
};

export function updateChannelEndpoint({
  environment,
  identifier,
  endpoint,
}: UpdateChannelEndpointParams): Promise<ChannelEndpointDto> {
  return patch<ChannelEndpointDto>(`/channel-endpoints/${encodeURIComponent(identifier)}`, {
    environment,
    body: { endpoint },
  });
}

type DeleteChannelEndpointParams = {
  environment: IEnvironment;
  /** Only used for cache invalidation, not sent to the API. */
  subscriberId: string;
  identifier: string;
};

export function deleteChannelEndpoint({ environment, identifier }: DeleteChannelEndpointParams): Promise<void> {
  return del<void>(`/channel-endpoints/${encodeURIComponent(identifier)}`, { environment });
}
