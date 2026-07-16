import {
  AgentRuntimeProviderIdEnum,
  type WhatsAppEmbeddedSignupUnavailableReason,
  type WhatsAppSignupLinkStatus,
} from '@novu/shared';
import type { ConnectApiClient } from './client';
import { NovuApiError } from './client';

export type { WhatsAppSignupLinkStatus };

export interface IntegrationRecord {
  _id: string;
  identifier: string;
  name: string;
  providerId: string;
  channel?: string;
  kind?: string;
  active?: boolean;
}

function integrationEnvironmentId(environmentId: string) {
  return environmentId ? { _environmentId: environmentId } : {};
}

export async function listIntegrations(client: ConnectApiClient): Promise<IntegrationRecord[]> {
  const res = await client.axios.get<{ data?: IntegrationRecord[] } | IntegrationRecord[]>('/v1/integrations');
  const body = res.data;

  return Array.isArray(body) ? body : (body.data ?? []);
}

export interface VerifyManagedCredentialsInput {
  providerId: AgentRuntimeProviderIdEnum;
  apiKey: string;
  region?: string;
  externalWorkspaceId?: string;
}

export async function verifyManagedCredentials(
  client: ConnectApiClient,
  input: VerifyManagedCredentialsInput
): Promise<void> {
  await client.axios.post('/v1/agents/verify-credentials', {
    providerId: input.providerId,
    apiKey: input.apiKey,
    ...(input.region ? { region: input.region } : {}),
    ...(input.externalWorkspaceId ? { externalWorkspaceId: input.externalWorkspaceId } : {}),
  });
}

export async function createAgentRuntimeIntegration(
  client: ConnectApiClient,
  input: {
    environmentId: string;
    providerId: AgentRuntimeProviderIdEnum;
    name: string;
    credentials: Record<string, string>;
  }
): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: input.providerId,
    kind: 'agent',
    name: input.name,
    active: true,
    credentials: input.credentials,
    ...integrationEnvironmentId(input.environmentId),
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as IntegrationRecord);
}

export async function deleteIntegration(client: ConnectApiClient, integrationId: string): Promise<void> {
  await client.axios.delete(`/v1/integrations/${encodeURIComponent(integrationId)}`);
}

export async function createSlackIntegration(
  client: ConnectApiClient,
  input: { name: string; environmentId: string }
): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: 'slack',
    channel: 'chat',
    name: input.name,
    active: true,
    credentials: {},
    ...integrationEnvironmentId(input.environmentId),
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as IntegrationRecord);
}

export async function createTelegramIntegration(
  client: ConnectApiClient,
  input: { name: string; environmentId: string }
): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: 'telegram',
    channel: 'chat',
    name: input.name,
    active: true,
    credentials: {},
    ...integrationEnvironmentId(input.environmentId),
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as IntegrationRecord);
}

/**
 * Creates an empty WhatsApp Business integration (Slack/Telegram pattern):
 * credentials are filled in later by the Meta Embedded Signup completion
 * endpoint. The webhook verify token is auto-generated server-side on create.
 */
export async function createWhatsAppIntegration(
  client: ConnectApiClient,
  input: { name: string; environmentId: string }
): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: 'whatsapp-business',
    channel: 'chat',
    name: input.name,
    active: true,
    credentials: {},
    ...integrationEnvironmentId(input.environmentId),
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as IntegrationRecord);
}

/**
 * The shared unavailable reasons plus the CLI-only `endpoint_not_found`
 * sentinel for older self-hosted APIs without the availability endpoint.
 */
export type WhatsAppEmbeddedSignupAvailabilityReason = WhatsAppEmbeddedSignupUnavailableReason | 'endpoint_not_found';

export type WhatsAppEmbeddedSignupAvailability =
  | { available: true }
  | { available: false; reason: WhatsAppEmbeddedSignupAvailabilityReason };

/**
 * Availability pre-check for the Meta Embedded Signup flow. A 404 (older
 * self-hosted API without the endpoint) counts as unavailable so the CLI
 * falls back to the classic dashboard handoff.
 */
export async function getWhatsAppEmbeddedSignupAvailability(
  client: ConnectApiClient
): Promise<WhatsAppEmbeddedSignupAvailability> {
  let res: { data: { data?: WhatsAppEmbeddedSignupAvailability } | WhatsAppEmbeddedSignupAvailability };
  try {
    res = await client.axios.get('/v1/integrations/whatsapp/embedded-signup/availability');
  } catch (err) {
    if (err instanceof NovuApiError && err.status === 404) {
      return { available: false, reason: 'endpoint_not_found' };
    }

    throw err;
  }

  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as WhatsAppEmbeddedSignupAvailability);
}

export interface WhatsAppSignupLink {
  token: string;
  /** Absolute URL of the public tokenized signup page. */
  url: string;
  /** ISO timestamp when the link expires (30 minutes after minting). */
  expiresAt: string;
}

/**
 * Mints an opaque single-use token bound to the agent + WhatsApp integration
 * and returns the public signup page URL. Works with keyless sessions as well
 * as secret-key auth.
 */
export async function createWhatsAppSignupLink(
  client: ConnectApiClient,
  input: { agentIdentifier: string; integrationIdentifier: string }
): Promise<WhatsAppSignupLink> {
  const res = await client.axios.post<{ data?: WhatsAppSignupLink } | WhatsAppSignupLink>(
    '/v1/integrations/whatsapp/signup-link',
    input
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as WhatsAppSignupLink);
}

/**
 * Secret-free signup progress the CLI polls while the user completes Embedded
 * Signup in the browser. Public endpoint — authorization is the opaque token,
 * so it works for keyless sessions too.
 */
export async function getWhatsAppSignupLinkStatus(
  client: ConnectApiClient,
  token: string
): Promise<WhatsAppSignupLinkStatus> {
  const res = await client.axios.get<{ data?: WhatsAppSignupLinkStatus } | WhatsAppSignupLinkStatus>(
    '/v1/integrations/whatsapp/signup/status',
    { params: { token } }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as WhatsAppSignupLinkStatus);
}

export interface SendblueCredentials {
  apiKey: string;
  secretKey: string;
  from: string;
}

/**
 * Creates a Sendblue chat integration with credentials in one shot. Unlike
 * Telegram/Slack (which create an empty integration and save credentials via a
 * public token endpoint), Sendblue credentials are user-supplied up front, so
 * we pass them straight to `POST /v1/integrations` — which is both
 * external-API- and keyless-accessible — avoiding the keyless-incompatible
 * `PUT /v1/integrations/:id` credential-update path the dashboard uses.
 */
export async function createSendblueIntegration(
  client: ConnectApiClient,
  input: { name: string; environmentId: string; credentials: SendblueCredentials }
): Promise<IntegrationRecord> {
  const res = await client.axios.post<{ data?: IntegrationRecord } | IntegrationRecord>('/v1/integrations', {
    providerId: 'sendblue',
    channel: 'chat',
    name: input.name,
    active: true,
    credentials: {
      apiKey: input.credentials.apiKey,
      secretKey: input.credentials.secretKey,
      from: input.credentials.from,
    },
    ...integrationEnvironmentId(input.environmentId),
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as IntegrationRecord);
}

export async function slackQuickSetup(
  client: ConnectApiClient,
  integrationId: string,
  input: { configToken: string; agentId: string }
): Promise<void> {
  await client.axios.post(`/v1/integrations/${encodeURIComponent(integrationId)}/slack-quick-setup`, {
    configToken: input.configToken,
    agentId: input.agentId,
  });
}

/**
 * Returns the count of channel connections currently bound to the integration.
 * We use this as the OAuth-complete signal: after the user finishes the Slack
 * install, the chat-oauth callback creates a ChannelConnection record, and
 * the count goes from N to N+1.
 */
export async function countChannelConnectionsForIntegration(
  client: ConnectApiClient,
  integrationIdentifier: string
): Promise<number> {
  const res = await client.axios.get<{
    data?: unknown[];
    totalCount?: number;
  }>('/v1/channel-connections', {
    params: { integrationIdentifier, limit: 1 },
  });
  const body = res.data;
  if (typeof body.totalCount === 'number') return body.totalCount;

  return Array.isArray(body.data) ? body.data.length : 0;
}

export interface ConnectOauthUrlInput {
  integrationIdentifier: string;
  agentIdentifier: string;
  /**
   * Required for `subscriber` mode (default). The chat-oauth callback uses
   * this to attach the SLACK_USER channel endpoint that `welcome-message`
   * later looks up — without it, OAuth completes but the welcome DM never
   * fires because the use case finds no endpoint of the expected type.
   */
  subscriberId: string;
}

export async function generateConnectOauthUrl(client: ConnectApiClient, input: ConnectOauthUrlInput): Promise<string> {
  const res = await client.axios.post<{ data?: { url?: string } } | { url?: string } | string>(
    '/v1/integrations/channel-connections/oauth',
    {
      integrationIdentifier: input.integrationIdentifier,
      subscriberId: input.subscriberId,
      connectionMode: 'subscriber',
      // `autoLinkUser` makes the chat-oauth callback create a SLACK_USER
      // endpoint bound to this subscriber, using authed_user.id from Slack's
      // oauth.v2.access response. That endpoint is what welcome-message
      // queries to know which Slack user to DM.
      autoLinkUser: true,
      // Carry the agent identifier on the connection for observability /
      // future scoping. Optional in subscriber mode.
      context: { agent: input.agentIdentifier },
    }
  );
  const body = res.data;

  if (typeof body === 'string') return body;
  if ('data' in body && body.data?.url) return body.data.url;
  if ('url' in body && body.url) return body.url;

  throw new Error('Channel-connections OAuth response did not include a URL');
}
