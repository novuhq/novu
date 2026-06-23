import type { ConnectApiClient } from './client';

export interface AgentRecord {
  _id: string;
  identifier: string;
  name: string;
  description?: string;
  active?: boolean;
  runtime?: 'self-hosted' | 'managed';
}

export interface GeneratedAgentSpec {
  name: string;
  identifier: string;
  systemPrompt: string;
  /** Catalog IDs of Claude built-in tool types — already in the wire format expected by `POST /agents`. */
  tools: string[];
  /** MCP server catalog IDs — already in the wire format expected by `POST /agents`. */
  mcpServers: string[];
  /** Skills with only `skillId`; the `type` is implicitly 'anthropic' for generator output. */
  skills: Array<{ skillId: string }>;
}

export interface CreateManagedAgentInput {
  name: string;
  identifier: string;
  integrationId: string;
  providerId: string;
  systemPrompt: string;
  tools: string[];
  mcpServers: string[];
  skills: Array<{ skillId: string }>;
}

export interface AgentIntegrationEmbedded {
  _id: string;
  identifier: string;
  name: string;
  providerId: string;
  channel?: string;
  active: boolean;
  sharedInboundAddress?: string;
  defaultSenderName?: string;
}

export interface AgentIntegrationLink {
  _id: string;
  integration: AgentIntegrationEmbedded;
  connectedAt?: string | null;
}

export async function listAgents(client: ConnectApiClient): Promise<AgentRecord[]> {
  const res = await client.axios.get<{ data?: AgentRecord[] } | AgentRecord[]>('/v1/agents');
  const body = res.data;

  return Array.isArray(body) ? body : (body.data ?? []);
}

export async function generateAgent(client: ConnectApiClient, prompt: string): Promise<GeneratedAgentSpec> {
  const res = await client.axios.post<{ data?: GeneratedAgentSpec } | GeneratedAgentSpec>('/v1/agents/generate', {
    prompt,
    runtime: 'managed',
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as GeneratedAgentSpec);
}

export interface CreateBridgeAgentInput {
  name: string;
  identifier: string;
}

export async function createBridgeAgent(client: ConnectApiClient, input: CreateBridgeAgentInput): Promise<AgentRecord> {
  const res = await client.axios.post<{ data?: AgentRecord } | AgentRecord>('/v1/agents', {
    name: input.name,
    identifier: input.identifier,
    runtime: 'self-hosted',
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentRecord);
}

export async function updateAgentBridge(
  client: ConnectApiClient,
  agentIdentifier: string,
  input: { bridgeUrl?: string; devBridgeUrl?: string; devBridgeActive?: boolean }
): Promise<AgentRecord> {
  const res = await client.axios.put<{ data?: AgentRecord } | AgentRecord>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/bridge`,
    input
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentRecord);
}

export async function createManagedAgent(
  client: ConnectApiClient,
  input: CreateManagedAgentInput
): Promise<AgentRecord> {
  const res = await client.axios.post<{ data?: AgentRecord } | AgentRecord>('/v1/agents', {
    name: input.name,
    identifier: input.identifier,
    runtime: 'managed',
    managedRuntime: {
      providerId: input.providerId,
      integrationId: input.integrationId,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      mcpServers: input.mcpServers,
      // Generate-managed-agent returns `{ skillId }` only; the agent-create
      // DTO expects each entry to also carry `type` (defaults to 'anthropic'
      // for catalog-provided skills).
      skills: input.skills.map((s) => ({ type: 'anthropic' as const, skillId: s.skillId })),
    },
  });
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentRecord);
}

export async function addAgentIntegration(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<AgentIntegrationLink> {
  const res = await client.axios.post<{ data?: AgentIntegrationLink } | AgentIntegrationLink>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { integrationIdentifier }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentIntegrationLink);
}

/**
 * `POST /v1/agents/:id/integrations` with `providerId: 'novu-email-agent'`
 * triggers the server's special-case branch (see add-agent-integration
 * usecase) that auto-creates a per-agent Novu Email integration with a
 * unique shared inbound address (e.g. `myagent-abc@agentconnect.sh`) and
 * links it to the agent in one shot. Returns the agent integration link
 * with the embedded integration record, including `sharedInboundAddress`.
 */
export async function addAgentEmailIntegration(
  client: ConnectApiClient,
  agentIdentifier: string
): Promise<AgentIntegrationLink> {
  const res = await client.axios.post<{ data?: AgentIntegrationLink } | AgentIntegrationLink>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { providerId: 'novu-email-agent' }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as AgentIntegrationLink);
}

export async function listAgentIntegrations(
  client: ConnectApiClient,
  agentIdentifier: string,
  options?: { integrationIdentifier?: string; limit?: number }
): Promise<AgentIntegrationLink[]> {
  const res = await client.axios.get<{ data?: AgentIntegrationLink[] } | AgentIntegrationLink[]>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    {
      params: {
        limit: options?.limit ?? (options?.integrationIdentifier ? 1 : 100),
        ...(options?.integrationIdentifier ? { integrationIdentifier: options.integrationIdentifier } : {}),
      },
    }
  );
  const body = res.data;

  return Array.isArray(body) ? body : (body.data ?? []);
}

export interface SendAgentWelcomeMessageResult {
  sent: boolean;
  conversationId?: string;
  /** Present only for keyless sessions — opaque token for building the claim/sign-up link. */
  claimToken?: string;
}

export async function sendAgentWelcomeMessage(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<SendAgentWelcomeMessageResult> {
  const res = await client.axios.post<{ data?: SendAgentWelcomeMessageResult } | SendAgentWelcomeMessageResult>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/welcome-message`,
    { integrationIdentifier }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as SendAgentWelcomeMessageResult);
}

// ---- Telegram --------------------------------------------------------------

export interface TelegramConfigureResult {
  webhookUrl: string;
  configuredAt: string;
  botUsername: string;
}

export interface TelegramMobileLinkResult {
  /** Opaque setup token identifying this mobile-setup session. */
  token: string;
  /** Absolute URL the user opens on their phone to paste the BotFather token. */
  url: string;
  /** ISO-8601 expiry. */
  expiresAt: string;
}

export interface TelegramSubscriberLinkResult {
  /** `https://t.me/<bot>?start=<code>` — opens Telegram on phone, sends `/start <code>` to the bot. */
  deepLinkUrl: string;
  /** Bot username (no leading `@`). */
  botUsername: string;
  expiresAt: string;
}

export async function configureTelegramAgentWebhook(
  client: ConnectApiClient,
  integrationIdentifier: string
): Promise<TelegramConfigureResult> {
  const res = await client.axios.post<{ data?: TelegramConfigureResult } | TelegramConfigureResult>(
    `/v1/integrations/${encodeURIComponent(integrationIdentifier)}/webhook/configure`,
    {}
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as TelegramConfigureResult);
}

export async function issueTelegramMobileLink(
  client: ConnectApiClient,
  integrationIdentifier: string,
  subscriberId?: string
): Promise<TelegramMobileLinkResult> {
  const res = await client.axios.post<{ data?: TelegramMobileLinkResult } | TelegramMobileLinkResult>(
    `/v1/integrations/${encodeURIComponent(integrationIdentifier)}/mobile-link`,
    subscriberId ? { subscriberId } : {}
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as TelegramMobileLinkResult);
}

export interface TelegramMobileLinkStatus {
  valid: boolean;
  reason?: 'expired' | 'used' | 'invalid';
  agentName?: string;
  providerName?: string;
}

/**
 * Public endpoint — needs no auth header (the opaque setup token in the query string
 * authenticates the request). We're polling this to detect when the user
 * has finished pasting their BotFather token on the mobile setup page. This
 * endpoint does not consume the token; it only checks status. Once the mobile
 * setup page consumes the token, subsequent status checks return
 * `{ valid: false, reason: 'used' }`.
 *
 * Why this and not `GET /v1/integrations`: ApiKey-authed callers never get
 * decrypted credentials back from the integration list endpoint (intentional
 * security gate in canUserAccessCredentials), so we can't see the bot-token
 * field flip from undefined → set. The status endpoint sidesteps that.
 */
export async function getTelegramMobileLinkStatus(
  client: ConnectApiClient,
  token: string
): Promise<TelegramMobileLinkStatus> {
  const res = await client.axios.get<{ data?: TelegramMobileLinkStatus } | TelegramMobileLinkStatus>(
    '/v1/integrations/mobile-configure/status',
    { params: { token } }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as TelegramMobileLinkStatus);
}

export interface ConsumeTelegramMobileLinkResult {
  success: true;
  botUsername: string;
  webhookUrl: string;
  deepLinkUrl?: string;
}

/**
 * Public endpoint — the opaque setup token authenticates the request. Persists
 * the BotFather token onto the linked Telegram integration and registers the
 * webhook. The dashboard setup page and the CLI (via `--telegram-bot-token`
 * for headless CI) both call this endpoint.
 */
export async function consumeTelegramMobileLink(
  client: ConnectApiClient,
  input: { token: string; botToken: string }
): Promise<ConsumeTelegramMobileLinkResult> {
  const res = await client.axios.post<{ data?: ConsumeTelegramMobileLinkResult } | ConsumeTelegramMobileLinkResult>(
    '/v1/integrations/mobile-configure',
    { token: input.token, botToken: input.botToken }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as ConsumeTelegramMobileLinkResult);
}

export interface SlackSetupLinkResult {
  token: string;
  url: string;
  expiresAt: string;
}

export interface SlackSetupLinkStatus {
  valid: boolean;
  reason?: 'expired' | 'used' | 'invalid';
  agentName?: string;
  providerName?: string;
}

export async function issueSlackSetupLink(
  client: ConnectApiClient,
  agentIdentifier: string,
  integrationId: string
): Promise<SlackSetupLinkResult> {
  const res = await client.axios.post<{ data?: SlackSetupLinkResult } | SlackSetupLinkResult>(
    `/v1/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationId)}/slack/setup-link`,
    {}
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as SlackSetupLinkResult);
}

/**
 * Public endpoint — needs no auth header (the opaque setup token in the query string
 * authenticates the request). Poll this to detect when the user has pasted their
 * Slack App Configuration Token on the secure setup page.
 */
export async function getSlackSetupLinkStatus(client: ConnectApiClient, token: string): Promise<SlackSetupLinkStatus> {
  const res = await client.axios.get<{ data?: SlackSetupLinkStatus } | SlackSetupLinkStatus>(
    '/v1/agents/public/slack/setup/status',
    { params: { token } }
  );
  const body = res.data;

  return 'data' in body && body.data ? body.data : (body as SlackSetupLinkStatus);
}

export async function issueTelegramSubscriberLink(
  client: ConnectApiClient,
  integrationIdentifier: string,
  subscriberId: string
): Promise<TelegramSubscriberLinkResult> {
  type LinkChannelEndpointResponse = {
    url: string;
    providerMetadata?: { botUsername?: string; expiresAt?: string };
  };

  const res = await client.axios.post<{ data?: LinkChannelEndpointResponse } | LinkChannelEndpointResponse>(
    '/v1/integrations/channel-endpoints/link',
    { integrationIdentifier, subscriberId }
  );
  const body = res.data;
  const payload = 'data' in body && body.data ? body.data : (body as LinkChannelEndpointResponse);

  return {
    deepLinkUrl: payload.url,
    botUsername: payload.providerMetadata?.botUsername ?? '',
    expiresAt: payload.providerMetadata?.expiresAt ?? '',
  };
}
