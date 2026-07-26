import type { IEnvironment } from '@novu/shared';
import { get } from './api.client';

export type ChannelConnectionDto = {
  identifier: string;
  channel: string | null;
  providerId: string | null;
  integrationIdentifier: string | null;
  subscriberId: string | null;
  contextKeys: string[];
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
