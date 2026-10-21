import { type ApiClient, ApiError, createPublicApiClient, unwrap } from './client';

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
  const baseUrl = apiUrl.replace(/\/$/, '');

  let res: { data?: { data?: { applicationIdentifier?: string }; applicationIdentifier?: string } };
  try {
    res = await createPublicApiClient(baseUrl).post('/v1/setup/keyless', {});
  } catch (err) {
    throw new Error(describeKeylessBootstrapFailure(baseUrl, err));
  }

  const identifier = res.data?.data?.applicationIdentifier ?? res.data?.applicationIdentifier;

  if (!identifier?.startsWith('pk_keyless_')) {
    throw new Error('Keyless session response did not include a valid application identifier.');
  }

  return identifier;
}

/**
 * This call runs before there are credentials, so it says plainly why the API could not be used.
 * A refused connection on Node 20+ arrives as an `AggregateError` with an empty message
 * (happy-eyeballs tries ::1 and 127.0.0.1), which would otherwise print as a bare `error:`.
 */
function describeKeylessBootstrapFailure(baseUrl: string, err: unknown): string {
  const code = err instanceof ApiError ? err.code : undefined;
  const status = err instanceof ApiError ? err.status : undefined;

  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ECONNRESET' || code === 'ETIMEDOUT') {
    return `Could not reach the API at ${baseUrl} (${code}). Is it running?`;
  }

  if (status) {
    return `The API at ${baseUrl} rejected the keyless session request (${status}).`;
  }

  const message = err instanceof Error ? err.message : String(err);

  return message || `Could not create a keyless session against ${baseUrl}.`;
}

export async function listIntegrations(client: ApiClient): Promise<IntegrationRecord[]> {
  const res = await client.axios.get<{ data?: IntegrationRecord[] } | IntegrationRecord[]>('/v1/channels/apps');
  const body = unwrap(res.data);

  return Array.isArray(body) ? body : [];
}

export async function createTelegramIntegration(client: ApiClient, name: string): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/channels/apps', {
    providerId: 'telegram',
    channel: 'chat',
    name,
    active: true,
    credentials: {},
  });

  return unwrap(res.data);
}

export async function listAgentIntegrations(
  client: ApiClient,
  agentIdentifier: string,
  query?: { integrationIdentifier?: string }
): Promise<AgentIntegrationLink[]> {
  const res = await client.axios.get<{ data?: AgentIntegrationLink[] } | AgentIntegrationLink[]>('/v1/channels', {
    params: { ...query, agentIdentifier },
  });
  const body = unwrap(res.data);

  return Array.isArray(body) ? body : [];
}

export async function linkAgentIntegration(
  client: ApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<void> {
  await client.axios.post('/v1/channels', { integrationIdentifier }, { params: { agentIdentifier } });
}

/**
 * `providerId: 'agent-email-inbox'` triggers the server's special-case branch
 * that auto-creates a per-agent Agent Email Inbox with a unique shared
 * inbound address (e.g. `human-relay-abc@agentconnect.sh`) and links it in
 * one shot. Relay agents only — dashboard agents keep `novu-email-agent`.
 */
export async function addAgentEmailIntegration(
  client: ApiClient,
  agentIdentifier: string
): Promise<AgentIntegrationLink> {
  const res = await client.axios.post<{ data?: AgentIntegrationLink } | AgentIntegrationLink>(
    '/v1/channels',
    { providerId: 'agent-email-inbox' },
    { params: { agentIdentifier } }
  );

  return unwrap(res.data);
}

export interface TelegramMobileLink {
  token: string;
  url: string;
  expiresAt: string;
}

export async function issueTelegramMobileLink(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId?: string
): Promise<TelegramMobileLink> {
  const res = await client.axios.post<{ data?: TelegramMobileLink } | TelegramMobileLink>(
    `/v1/channels/apps/${encodeURIComponent(integrationIdentifier)}/telegram-link`,
    subscriberId ? { subscriberId } : {}
  );

  return unwrap(res.data);
}

export async function getTelegramMobileLinkStatus(
  client: ApiClient,
  token: string
): Promise<{ valid: boolean; reason?: 'expired' | 'used' | 'invalid' }> {
  const res = await client.axios.get<
    | { data?: { valid: boolean; reason?: 'expired' | 'used' | 'invalid' } }
    | { valid: boolean; reason?: 'expired' | 'used' | 'invalid' }
  >('/v1/channels/telegram/setup', { params: { token } });

  return unwrap(res.data);
}

export async function consumeTelegramMobileLink(
  client: ApiClient,
  input: { token: string; botToken: string }
): Promise<{ success: true; botUsername: string; deepLinkUrl?: string }> {
  const res = await client.axios.post<
    | { data?: { success: true; botUsername: string; deepLinkUrl?: string } }
    | {
        success: true;
        botUsername: string;
        deepLinkUrl?: string;
      }
  >('/v1/channels/telegram/setup', input);

  return unwrap(res.data);
}

export async function issueTelegramSubscriberLink(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<{ deepLinkUrl: string; botUsername: string }> {
  const res = await client.axios.post<
    | { data?: { url: string; providerMetadata?: { botUsername?: string } } }
    | {
        url: string;
        providerMetadata?: { botUsername?: string };
      }
  >('/v1/channels/telegram/link', { integrationIdentifier, subscriberId });
  const payload = unwrap(res.data);

  return { deepLinkUrl: payload.url, botUsername: payload.providerMetadata?.botUsername ?? '' };
}

export async function createSlackIntegration(client: ApiClient, name: string): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/channels/apps', {
    providerId: 'slack',
    channel: 'chat',
    name,
    active: true,
    credentials: {},
  });

  return unwrap(res.data);
}

export async function slackQuickSetup(
  client: ApiClient,
  integrationId: string,
  input: { configToken: string; agentId: string }
): Promise<void> {
  await client.axios.post(`/v1/channels/apps/${encodeURIComponent(integrationId)}/slack-quick-setup`, {
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
  client: ApiClient,
  input: { integrationIdentifier: string; agentIdentifier: string; subscriberId: string }
): Promise<string> {
  const res = await client.axios.post<{ data?: { url?: string } } | { url?: string } | string>(
    '/v1/channels/slack/install-link',
    {
      integrationIdentifier: input.integrationIdentifier,
      subscriberId: input.subscriberId,
      connectionMode: 'subscriber',
      autoLinkUser: true,
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
  client: ApiClient,
  agentIdentifier: string,
  integrationId: string,
  subscriberId?: string
): Promise<{ token: string; url: string; expiresAt: string }> {
  const res = await client.axios.post<
    { data?: { token: string; url: string; expiresAt: string } } | { token: string; url: string; expiresAt: string }
  >(`/v1/channels/apps/${encodeURIComponent(integrationId)}/slack-setup-link`, subscriberId ? { subscriberId } : {}, {
    params: { agentIdentifier },
  });

  return unwrap(res.data);
}

export async function getSlackSetupLinkStatus(
  client: ApiClient,
  token: string
): Promise<{ valid: boolean; reason?: 'expired' | 'used' | 'invalid' }> {
  const res = await client.axios.get<
    | { data?: { valid: boolean; reason?: 'expired' | 'used' | 'invalid' } }
    | {
        valid: boolean;
        reason?: 'expired' | 'used' | 'invalid';
      }
  >('/v1/channels/slack/setup', { params: { token } });

  return unwrap(res.data);
}

export async function hasChannelEndpoint(
  client: ApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<boolean> {
  const res = await client.axios.get<{ data?: unknown[] } | unknown[]>('/v1/channels/links', {
    params: { subscriberId, integrationIdentifier, limit: 1 },
  });
  const body = unwrap(res.data);

  return Array.isArray(body) && body.length > 0;
}
