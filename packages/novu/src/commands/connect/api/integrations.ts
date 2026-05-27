import type { ConnectApiClient } from './client';

export interface IntegrationRecord {
  _id: string;
  identifier: string;
  name: string;
  providerId: string;
  channel?: string;
  kind?: string;
  active?: boolean;
}

export async function listIntegrations(client: ConnectApiClient): Promise<IntegrationRecord[]> {
  const res = await client.axios.get<{ data?: IntegrationRecord[] } | IntegrationRecord[]>('/v1/integrations');
  const body = res.data;

  return Array.isArray(body) ? body : (body.data ?? []);
}

export async function generateConnectOauthUrl(
  client: ConnectApiClient,
  integrationIdentifier: string
): Promise<string> {
  const res = await client.axios.post<{ data?: { url?: string } } | { url?: string } | string>(
    '/v1/integrations/channel-connections/oauth',
    { integrationIdentifier, connectionMode: 'shared' }
  );
  const body = res.data;

  if (typeof body === 'string') return body;
  if ('data' in body && body.data?.url) return body.data.url;
  if ('url' in body && body.url) return body.url;

  throw new Error('Channel-connections OAuth response did not include a URL');
}
