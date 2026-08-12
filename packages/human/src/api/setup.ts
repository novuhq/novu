import { HumanApiClient, loopbackHttpsAgent, unwrap } from './client';

export interface IntegrationRecord {
  _id: string;
  identifier: string;
  providerId: string;
  channel: string;
  active?: boolean;
  kind?: string;
}

export interface AgentIntegrationLink {
  integration: { identifier: string; providerId: string; channel?: string; active?: boolean };
  connectedAt?: string;
}

export async function bootstrapKeylessSession(apiUrl: string): Promise<string> {
  const axios = (await import('axios')).default;
  const baseUrl = apiUrl.replace(/\/$/, '');
  const res = await axios.post<{ data?: { applicationIdentifier?: string }; applicationIdentifier?: string }>(
    `${baseUrl}/v1/inbox/session`,
    {},
    { httpsAgent: loopbackHttpsAgent(baseUrl) }
  );
  const identifier = res.data?.data?.applicationIdentifier ?? res.data?.applicationIdentifier;

  if (!identifier?.startsWith('pk_keyless_')) {
    throw new Error('Keyless session response did not include a valid application identifier.');
  }

  return identifier;
}

export async function listIntegrations(client: HumanApiClient): Promise<IntegrationRecord[]> {
  const res = await client.axios.get<{ data?: IntegrationRecord[] } | IntegrationRecord[]>('/v1/integrations');
  const body = unwrap(res.data);

  return Array.isArray(body) ? body : [];
}

export async function createTelegramIntegration(client: HumanApiClient, name: string): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: 'telegram',
    channel: 'chat',
    name,
    active: true,
    credentials: {},
  });

  return unwrap(res.data);
}

export async function listAgentIntegrations(
  client: HumanApiClient,
  agentIdentifier: string,
  query?: { integrationIdentifier?: string }
): Promise<AgentIntegrationLink[]> {
  const res = await client.axios.get<{ data?: AgentIntegrationLink[] } | AgentIntegrationLink[]>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { params: query }
  );
  const body = unwrap(res.data);

  return Array.isArray(body) ? body : [];
}

export async function linkAgentIntegration(
  client: HumanApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<void> {
  await client.axios.post(`/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`, {
    integrationIdentifier,
  });
}

export interface TelegramMobileLink {
  token: string;
  url: string;
  expiresAt: string;
}

export async function issueTelegramMobileLink(
  client: HumanApiClient,
  integrationIdentifier: string,
  subscriberId?: string
): Promise<TelegramMobileLink> {
  const res = await client.axios.post<{ data?: TelegramMobileLink } | TelegramMobileLink>(
    `/v1/integrations/${encodeURIComponent(integrationIdentifier)}/mobile-link`,
    subscriberId ? { subscriberId } : {}
  );

  return unwrap(res.data);
}

export async function getTelegramMobileLinkStatus(
  client: HumanApiClient,
  token: string
): Promise<{ valid: boolean; reason?: 'expired' | 'used' | 'invalid' }> {
  const res = await client.axios.get<
    { data?: { valid: boolean; reason?: 'expired' | 'used' | 'invalid' } } | { valid: boolean; reason?: 'expired' | 'used' | 'invalid' }
  >('/v1/integrations/mobile-configure/status', { params: { token } });

  return unwrap(res.data);
}

export async function consumeTelegramMobileLink(
  client: HumanApiClient,
  input: { token: string; botToken: string }
): Promise<{ success: true; botUsername: string; deepLinkUrl?: string }> {
  const res = await client.axios.post<
    { data?: { success: true; botUsername: string; deepLinkUrl?: string } } | {
      success: true;
      botUsername: string;
      deepLinkUrl?: string;
    }
  >('/v1/integrations/mobile-configure', input);

  return unwrap(res.data);
}

export async function issueTelegramSubscriberLink(
  client: HumanApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const res = await client.axios.post<
    { data?: { url: string; providerMetadata?: { botUsername?: string } } } | {
      url: string;
      providerMetadata?: { botUsername?: string };
    }
  >('/v1/integrations/channel-endpoints/link', { integrationIdentifier, subscriberId });
  const payload = unwrap(res.data);

  return { deepLinkUrl: payload.url, botUsername: payload.providerMetadata?.botUsername ?? '' };
}

export async function hasChannelEndpoint(
  client: HumanApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<boolean> {
  const res = await client.axios.get<{ data?: unknown[] } | unknown[]>('/v1/channel-endpoints', {
    params: { subscriberId, integrationIdentifier, limit: 1 },
  });
  const body = unwrap(res.data);

  return Array.isArray(body) && body.length > 0;
}
