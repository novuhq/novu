import type { ChannelEndpointType, IEnvironment } from '@novu/shared';
import { get } from './api.client';

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

export function listChannelEndpoints({
  environment,
  integrationIdentifier,
  limit = 50,
  signal,
}: {
  environment: IEnvironment;
  integrationIdentifier: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ChannelEndpointsListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('limit', limit.toString());
  searchParams.append('integrationIdentifier', integrationIdentifier);

  return get<ChannelEndpointsListResponse>(`/channel-endpoints?${searchParams.toString()}`, {
    environment,
    signal,
  });
}
