import { pollUntil } from '../pipeline/poll-until';
import type { ConnectApiClient } from './client';

export interface ChannelEndpointRecord {
  identifier: string;
  subscriberId: string;
  integrationIdentifier: string;
  providerId: string;
}

export async function listChannelEndpoints(
  client: ConnectApiClient,
  query: {
    subscriberId?: string;
    integrationIdentifier?: string;
    providerId?: string;
    limit?: number;
  }
): Promise<ChannelEndpointRecord[]> {
  const res = await client.axios.get<{ data?: ChannelEndpointRecord[] } | ChannelEndpointRecord[]>(
    '/v1/channel-endpoints',
    { params: query }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as ChannelEndpointRecord[]);
}

export async function isTelegramSubscriberConnected(
  client: ConnectApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<boolean> {
  const endpoints = await listChannelEndpoints(client, {
    subscriberId,
    integrationIdentifier,
    providerId: 'telegram',
    limit: 1,
  });

  return endpoints.length > 0;
}

/** Poll until a Telegram channel endpoint exists for the subscriber. */
export async function pollForTelegramChannelEndpoint(
  client: ConnectApiClient,
  integrationIdentifier: string,
  subscriberId: string,
  options: { intervalMs: number; timeoutMs: number }
): Promise<boolean> {
  return pollUntil(async () => {
    const connected = await isTelegramSubscriberConnected(client, integrationIdentifier, subscriberId);

    return connected ? 'done' : 'pending';
  }, options);
}
