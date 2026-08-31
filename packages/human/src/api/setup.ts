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
  integration: {
    _id?: string;
    identifier: string;
    providerId: string;
    channel?: string;
    active?: boolean;
    sharedInboundAddress?: string;
  };
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

/**
 * `providerId: 'novu-email-agent'` triggers the server's special-case branch
 * that auto-creates a per-agent Novu Email integration with a unique shared
 * inbound address (e.g. `human-relay-abc@agentconnect.sh`) and links it in
 * one shot.
 */
export async function addAgentEmailIntegration(
  client: HumanApiClient,
  agentIdentifier: string
): Promise<AgentIntegrationLink> {
  const res = await client.axios.post<{ data?: AgentIntegrationLink } | AgentIntegrationLink>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { providerId: 'novu-email-agent' }
  );

  return unwrap(res.data);
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
    | { data?: { valid: boolean; reason?: 'expired' | 'used' | 'invalid' } }
    | { valid: boolean; reason?: 'expired' | 'used' | 'invalid' }
  >('/v1/integrations/mobile-configure/status', { params: { token } });

  return unwrap(res.data);
}

export async function consumeTelegramMobileLink(
  client: HumanApiClient,
  input: { token: string; botToken: string }
): Promise<{ success: true; botUsername: string; deepLinkUrl?: string }> {
  const res = await client.axios.post<
    | { data?: { success: true; botUsername: string; deepLinkUrl?: string } }
    | {
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
    | { data?: { url: string; providerMetadata?: { botUsername?: string } } }
    | {
        url: string;
        providerMetadata?: { botUsername?: string };
      }
  >('/v1/integrations/channel-endpoints/link', { integrationIdentifier, subscriberId });
  const payload = unwrap(res.data);

  return { deepLinkUrl: payload.url, botUsername: payload.providerMetadata?.botUsername ?? '' };
}

export async function createSlackIntegration(client: HumanApiClient, name: string): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: 'slack',
    channel: 'chat',
    name,
    active: true,
    credentials: {},
  });

  return unwrap(res.data);
}

export async function slackQuickSetup(
  client: HumanApiClient,
  integrationId: string,
  input: { configToken: string; agentId: string }
): Promise<void> {
  await client.axios.post(`/v1/integrations/${encodeURIComponent(integrationId)}/slack-quick-setup`, {
    configToken: input.configToken,
    agentId: input.agentId,
  });
}

/**
 * Builds the Slack install/authorize URL. `autoLinkUser` makes the OAuth
 * callback create a SLACK_USER channel endpoint bound to the subscriber —
 * that endpoint is what human-interaction delivery DMs.
 */
export async function generateConnectOauthUrl(
  client: HumanApiClient,
  input: { integrationIdentifier: string; agentIdentifier: string; subscriberId: string }
): Promise<string> {
  const res = await client.axios.post<{ data?: { url?: string } } | { url?: string } | string>(
    '/v1/integrations/channel-connections/oauth',
    {
      integrationIdentifier: input.integrationIdentifier,
      subscriberId: input.subscriberId,
      connectionMode: 'subscriber',
      autoLinkUser: true,
      context: { agent: input.agentIdentifier },
    }
  );
  const body = unwrap(res.data);
  const url = typeof body === 'string' ? body : body?.url;

  if (!url) {
    throw new Error('The API did not return a Slack authorize URL.');
  }

  return url;
}

export async function issueSlackSetupLink(
  client: HumanApiClient,
  agentIdentifier: string,
  integrationId: string
): Promise<{ token: string; url: string; expiresAt: string }> {
  const res = await client.axios.post<
    { data?: { token: string; url: string; expiresAt: string } } | { token: string; url: string; expiresAt: string }
  >(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationId)}/slack/setup-link`,
    {}
  );

  return unwrap(res.data);
}

export async function getSlackSetupLinkStatus(
  client: HumanApiClient,
  token: string
): Promise<{ valid: boolean; reason?: 'expired' | 'used' | 'invalid' }> {
  const res = await client.axios.get<
    | { data?: { valid: boolean; reason?: 'expired' | 'used' | 'invalid' } }
    | {
        valid: boolean;
        reason?: 'expired' | 'used' | 'invalid';
      }
  >('/v1/agents/public/slack/setup/status', { params: { token } });

  return unwrap(res.data);
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

/** Best-effort; GET /v2/subscribers is not always available (e.g. keyless). */
export async function getSubscriberEmail(client: HumanApiClient, subscriberId: string): Promise<string | undefined> {
  try {
    const res = await client.axios.get<{ data?: { email?: string } } | { email?: string }>(
      `/v2/subscribers/${encodeURIComponent(subscriberId)}`
    );
    const body = unwrap(res.data);
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    return email || undefined;
  } catch {
    return undefined;
  }
}
