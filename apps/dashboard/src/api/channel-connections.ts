import { ChannelTypeEnum, ConnectionMode, IEnvironment, ProvidersIdEnum } from '@novu/shared';
import { get } from './api.client';

export type ChannelConnectionDto = {
  identifier: string;
  channel: ChannelTypeEnum | null;
  providerId: ProvidersIdEnum | null;
  integrationIdentifier: string | null;
  subscriberId: string | null;
  contextKeys: string[];
  workspace: { id: string; name?: string };
  connected: boolean;
  connectionMode: ConnectionMode;
  createdAt: string;
  updatedAt: string;
};

type ListChannelConnectionsResponse = {
  data: ChannelConnectionDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
};

export type ListChannelConnectionsParams = {
  subscriberId?: string;
  integrationIdentifier?: string;
  channel?: ChannelTypeEnum;
  providerId?: ProvidersIdEnum;
  contextKeys?: string[];
  limit?: number;
  after?: string;
};

export async function listChannelConnections(
  params: ListChannelConnectionsParams,
  environment: IEnvironment
): Promise<ListChannelConnectionsResponse> {
  const searchParams = new URLSearchParams();

  if (params.subscriberId) searchParams.set('subscriberId', params.subscriberId);
  if (params.integrationIdentifier) searchParams.set('integrationIdentifier', params.integrationIdentifier);
  if (params.channel) searchParams.set('channel', params.channel);
  if (params.providerId) searchParams.set('providerId', params.providerId);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.after) searchParams.set('after', params.after);
  if (params.contextKeys?.length) {
    for (const key of params.contextKeys) {
      searchParams.append('contextKeys', key);
    }
  }

  const query = searchParams.toString();
  const url = `/channel-connections${query ? `?${query}` : ''}`;

  return get<ListChannelConnectionsResponse>(url, { environment });
}

export async function getChannelConnection(
  identifier: string,
  environment: IEnvironment
): Promise<ChannelConnectionDto> {
  const { data } = await get<{ data: ChannelConnectionDto }>(`/channel-connections/${identifier}`, { environment });

  return data;
}
