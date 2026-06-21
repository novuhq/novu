import { ChannelEndpointType, ChannelTypeEnum, IEnvironment, ProvidersIdEnum } from '@novu/shared';
import { get } from './api.client';

export type ChannelEndpointDto = {
  identifier: string;
  channel: ChannelTypeEnum | null;
  providerId: ProvidersIdEnum | null;
  integrationIdentifier: string | null;
  connectionIdentifier: string | null;
  subscriberId: string | null;
  contextKeys: string[];
  type: ChannelEndpointType;
  endpoint: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

type ListChannelEndpointsResponse = {
  data: ChannelEndpointDto[];
  next: string | null;
  previous: string | null;
  totalCount: number;
};

export type ListChannelEndpointsParams = {
  subscriberId?: string;
  connectionIdentifier?: string;
  integrationIdentifier?: string;
  channel?: ChannelTypeEnum;
  providerId?: ProvidersIdEnum;
  contextKeys?: string[];
  limit?: number;
  after?: string;
};

export async function listChannelEndpoints(
  params: ListChannelEndpointsParams,
  environment: IEnvironment
): Promise<ListChannelEndpointsResponse> {
  const searchParams = new URLSearchParams();

  if (params.subscriberId) searchParams.set('subscriberId', params.subscriberId);
  if (params.connectionIdentifier) searchParams.set('connectionIdentifier', params.connectionIdentifier);
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
  const url = `/channel-endpoints${query ? `?${query}` : ''}`;

  return get<ListChannelEndpointsResponse>(url, { environment });
}
