import type {
  AgentMcpServerEnablementDto,
  AgentRuntime,
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  DirectionEnum,
  IEnvironment,
} from '@novu/shared';
import { del, get, getApiBaseUrl, NovuApiError, patch, post } from '@/api/api.client';

/** Root segment for TanStack Query keys; use with {@link getAgentsListQueryKey}. */
export const AGENTS_LIST_QUERY_KEY = 'fetchAgents' as const;

const AGENT_DETAIL_QUERY_KEY = 'fetchAgent' as const;

const AGENT_INTEGRATIONS_QUERY_KEY = 'fetchAgentIntegrations' as const;

const AGENT_EMOJI_QUERY_KEY = 'fetchAgentEmoji' as const;

const AGENT_RUNTIME_CONFIG_QUERY_KEY = 'fetchAgentRuntimeConfig' as const;

const AGENT_MCP_SERVERS_QUERY_KEY = 'fetchAgentMcpServers' as const;

export function getAgentDetailQueryKey(environmentId: string | undefined, identifier: string | undefined) {
  return [AGENT_DETAIL_QUERY_KEY, environmentId, identifier] as const;
}

export function getAgentIntegrationsQueryKey(environmentId: string | undefined, agentIdentifier: string | undefined) {
  return [AGENT_INTEGRATIONS_QUERY_KEY, environmentId, agentIdentifier] as const;
}

export function getAgentsListQueryKey(
  environmentId: string | undefined,
  params: { after?: string; before?: string; limit: number; identifier: string }
) {
  return [AGENTS_LIST_QUERY_KEY, environmentId, params] as const;
}

export function getAgentRuntimeConfigQueryKey(environmentId: string | undefined, agentIdentifier: string | undefined) {
  return [AGENT_RUNTIME_CONFIG_QUERY_KEY, environmentId, agentIdentifier] as const;
}

export function getAgentMcpServersQueryKey(environmentId: string | undefined, agentIdentifier: string | undefined) {
  return [AGENT_MCP_SERVERS_QUERY_KEY, environmentId, agentIdentifier] as const;
}

export type AgentIntegrationSummary = {
  integrationId: string;
  providerId: string;
  name: string;
  identifier: string;
  channel: ChannelTypeEnum;
  active: boolean;
};

export type AgentBehavior = {
  acknowledgeOnReceived?: boolean;
  reactionOnResolved?: string | null;
};

export type ManagedRuntimeResponse = {
  providerId: string;
  integrationId: string;
  externalAgentId: string;
  externalEnvironmentId?: string;
  externalWorkspaceId?: string;
  consoleUrl?: string;
};

export type AgentResponse = {
  _id: string;
  name: string;
  identifier: string;
  description?: string;
  active: boolean;
  behavior?: AgentBehavior;
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
  runtime?: AgentRuntime;
  managedRuntime?: ManagedRuntimeResponse;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  integrations?: AgentIntegrationSummary[];
};

export type ListAgentsResponse = {
  data: AgentResponse[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

type AgentSkillInputDto = {
  type: 'anthropic' | 'custom';
  skillId: string;
  version?: string | null;
};

type ManagedRuntimeDto = {
  providerId: AgentRuntimeProviderIdEnum;
  integrationId: string;
  externalAgentId?: string;
  externalEnvironmentId?: string;
  model?: string;
  systemPrompt?: string;
  tools?: string[];
  mcpServers?: string[];
  skills?: AgentSkillInputDto[];
};

export type CreateAgentBody = {
  name: string;
  identifier: string;
  description?: string;
  active?: boolean;
  runtime?: AgentRuntime;
  managedRuntime?: ManagedRuntimeDto;
};

export type UpdateAgentBody = {
  name?: string;
  description?: string;
  active?: boolean;
  behavior?: AgentBehavior;
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
};

export type ListAgentsParams = {
  environment: IEnvironment;
  limit?: number;
  after?: string;
  before?: string;
  orderBy?: 'createdAt' | 'updatedAt' | '_id';
  orderDirection?: DirectionEnum;
  identifier?: string;
  signal?: AbortSignal;
};

function buildAgentsQuery(params: ListAgentsParams): string {
  const searchParams = new URLSearchParams();

  if (params.limit != null) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.after) {
    searchParams.set('after', params.after);
  }

  if (params.before) {
    searchParams.set('before', params.before);
  }

  if (params.orderBy) {
    searchParams.set('orderBy', params.orderBy);
  }

  if (params.orderDirection) {
    searchParams.set('orderDirection', params.orderDirection);
  }

  if (params.identifier) {
    searchParams.set('identifier', params.identifier);
  }

  const qs = searchParams.toString();

  return qs ? `?${qs}` : '';
}

export function listAgents(params: ListAgentsParams): Promise<ListAgentsResponse> {
  const query = buildAgentsQuery(params);

  return get<ListAgentsResponse>(`/agents${query}`, {
    environment: params.environment,
    signal: params.signal,
  });
}

type AgentApiEnvelope = { data: AgentResponse };

export async function getAgent(
  environment: IEnvironment,
  identifier: string,
  signal?: AbortSignal
): Promise<AgentResponse> {
  const response = await get<AgentApiEnvelope>(`/agents/${encodeURIComponent(identifier)}`, {
    environment,
    signal,
  });

  return response.data;
}

export async function createAgent(environment: IEnvironment, body: CreateAgentBody): Promise<AgentResponse> {
  const response = await post<AgentApiEnvelope>('/agents', { environment, body });

  return response.data;
}

export type VerifyManagedCredentialsBody = {
  providerId: AgentRuntimeProviderIdEnum;
  apiKey: string;
  externalWorkspaceId?: string;
};

export type VerifyManagedCredentialsResponse = { valid: true };

export async function verifyManagedCredentials(
  environment: IEnvironment,
  body: VerifyManagedCredentialsBody,
  signal?: AbortSignal
): Promise<VerifyManagedCredentialsResponse> {
  const response = await post<{ data: VerifyManagedCredentialsResponse } | VerifyManagedCredentialsResponse>(
    '/agents/verify-credentials',
    { environment, body, signal }
  );

  return 'data' in response ? response.data : response;
}

export async function updateAgent(
  environment: IEnvironment,
  identifier: string,
  body: UpdateAgentBody
): Promise<AgentResponse> {
  const response = await patch<AgentApiEnvelope>(`/agents/${encodeURIComponent(identifier)}`, { environment, body });

  return response.data;
}

export function deleteAgent(environment: IEnvironment, identifier: string): Promise<void> {
  return del(`/agents/${encodeURIComponent(identifier)}`, { environment });
}

/** Picked integration fields on an agent–integration link (matches API `integration`). */
export type AgentIntegrationEmbedded = {
  _id: string;
  identifier: string;
  name: string;
  providerId: string;
  channel: ChannelTypeEnum;
  active: boolean;
  /**
   * Cloud only. The Novu shared inbox address for this agent when the shared-inbox
   * feature is enabled. The dashboard uses this as the headline inbound address and
   * to render the shared inbox row in the inbox list.
   */
  sharedInboundAddress?: string;
  /**
   * Default email From display name for NovuAgent integrations.
   * Mirrors `credentials.senderName`, falling back to the agent name when unset.
   */
  defaultSenderName?: string;
  /**
   * Cloud only. When `true`, the worker drops inbound mail addressed to this
   * agent on the shared `agentconnect.sh` domain. Custom-domain routes still
   * deliver. Only meaningful on the NovuAgent integration.
   */
  sharedInboxDisabled?: boolean;
};

/** Agent–integration link row returned by GET /agents/:identifier/integrations */
export type AgentIntegrationLink = {
  _id: string;
  _agentId: string;
  integration: AgentIntegrationEmbedded;
  _environmentId: string;
  _organizationId: string;
  connectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAgentIntegrationsResponse = {
  data: AgentIntegrationLink[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export type ListAgentIntegrationsParams = {
  environment: IEnvironment;
  agentIdentifier: string;
  limit?: number;
  signal?: AbortSignal;
};

function buildAgentIntegrationsQuery(params: ListAgentIntegrationsParams): string {
  const searchParams = new URLSearchParams();

  if (params.limit != null) {
    searchParams.set('limit', String(params.limit));
  }

  const qs = searchParams.toString();

  return qs ? `?${qs}` : '';
}

export function listAgentIntegrations(params: ListAgentIntegrationsParams): Promise<ListAgentIntegrationsResponse> {
  const query = buildAgentIntegrationsQuery(params);

  return get<ListAgentIntegrationsResponse>(
    `/agents/${encodeURIComponent(params.agentIdentifier)}/integrations${query}`,
    {
      environment: params.environment,
      signal: params.signal,
    }
  );
}

export type AddAgentIntegrationBody = {
  integrationIdentifier?: string;
  providerId?: string;
};

type AgentIntegrationLinkEnvelope = { data: AgentIntegrationLink };

export async function addAgentIntegration(
  environment: IEnvironment,
  agentIdentifier: string,
  body: AddAgentIntegrationBody
): Promise<AgentIntegrationLink> {
  const response = await post<AgentIntegrationLinkEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { environment, body }
  );

  return response.data;
}

export function removeAgentIntegration(
  environment: IEnvironment,
  agentIdentifier: string,
  agentIntegrationId: string
): Promise<void> {
  return del(`/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(agentIntegrationId)}`, {
    environment,
  });
}

export async function sendAgentTestEmail(
  environment: IEnvironment,
  agentIdentifier: string,
  targetAddress: string
): Promise<{ success: boolean }> {
  return post<{ success: boolean }>(`/agents/${encodeURIComponent(agentIdentifier)}/test-email`, {
    environment,
    body: { targetAddress },
  });
}

export type AgentMcpServer = {
  externalId: string;
  name: string;
  url: string;
  authToken?: string;
};

export type AgentTool = {
  externalId: string;
  name: string;
  type: 'builtin' | 'custom';
  description?: string;
};

export type AgentRuntimeCapabilities = {
  mcpServers: boolean;
  tools: boolean;
  model: boolean;
  systemPrompt: boolean;
  skills: boolean;
};

export type AgentRuntimeConfig = {
  model: string;
  systemPrompt: string;
  mcpServers: AgentMcpServer[];
  tools: AgentTool[];
  skills?: AgentSkillInputDto[];
  capabilities?: AgentRuntimeCapabilities;
};

export type PatchAgentRuntimeConfigBody = {
  model?: string;
  systemPrompt?: string;
  mcpServers?: AgentMcpServer[];
  tools?: AgentTool[];
  skills?: AgentSkillInputDto[];
};

type AgentRuntimeConfigEnvelope = { data: AgentRuntimeConfig };

export async function getAgentRuntimeConfig(
  environment: IEnvironment,
  agentIdentifier: string,
  signal?: AbortSignal
): Promise<AgentRuntimeConfig> {
  const response = await get<AgentRuntimeConfigEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/runtime/config`,
    { environment, signal }
  );

  return response.data;
}

export async function patchAgentRuntimeConfig(
  environment: IEnvironment,
  agentIdentifier: string,
  body: PatchAgentRuntimeConfigBody
): Promise<AgentRuntimeConfig> {
  const response = await patch<AgentRuntimeConfigEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/runtime/config`,
    { environment, body }
  );

  return response.data;
}

export type AgentMcpServerEnablement = AgentMcpServerEnablementDto;

export async function listAgentMcpServers(
  environment: IEnvironment,
  agentIdentifier: string,
  signal?: AbortSignal
): Promise<AgentMcpServerEnablement[]> {
  const response = await get<{ data: AgentMcpServerEnablement[] }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers`,
    { environment, signal }
  );

  return response.data;
}

export async function enableAgentMcpServer(
  environment: IEnvironment,
  agentIdentifier: string,
  mcpId: string
): Promise<AgentMcpServerEnablement> {
  const response = await post<{ data: AgentMcpServerEnablement }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers`,
    { environment, body: { mcpId } }
  );

  return response.data;
}

export function disableAgentMcpServer(
  environment: IEnvironment,
  agentIdentifier: string,
  mcpId: string
): Promise<void> {
  return del(`/agents/${encodeURIComponent(agentIdentifier)}/mcp-servers/${encodeURIComponent(mcpId)}`, {
    environment,
  });
}

type AgentIntegrationResponseEnvelope = { data: AgentIntegrationLink };

/** Enable or disable the Novu shared inbox for a single agent. */
export async function setAgentInboxSharedDisabled(
  environment: IEnvironment,
  agentIdentifier: string,
  disabled: boolean
): Promise<AgentIntegrationLink> {
  const response = await patch<AgentIntegrationResponseEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/inbox/shared`,
    { environment, body: { disabled } }
  );

  return response.data;
}

type WelcomeMessageResponse = { sent: boolean; conversationId?: string };

export async function sendAgentWelcomeMessage(
  environment: IEnvironment,
  agentIdentifier: string,
  integrationIdentifier: string,
  conversationId?: string
): Promise<WelcomeMessageResponse> {
  const response = await post<{ data: WelcomeMessageResponse }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/welcome-message`,
    { environment, body: { integrationIdentifier, conversationId } }
  );

  return response.data;
}

export type AgentEmojiEntry = {
  name: string;
  unicode: string;
};

export function getAgentEmojiQueryKey() {
  return [AGENT_EMOJI_QUERY_KEY] as const;
}

export async function listAgentEmoji(environment: IEnvironment, signal?: AbortSignal): Promise<AgentEmojiEntry[]> {
  const response = await get<{ data: AgentEmojiEntry[] }>('/agents/emoji', { environment, signal });

  return response.data;
}

export type WhatsAppValidateTokenError = {
  code:
    | 'invalid_token'
    | 'expired_token'
    | 'phone_not_found'
    | 'phone_mismatch'
    | 'waba_not_accessible'
    | 'waba_phone_mismatch'
    | 'missing_messaging_scope'
    | 'unknown';
  message: string;
};

export type WhatsAppValidateTokenResponse = {
  valid: boolean;
  hasManagementScope: boolean;
  hasMessagingScope: boolean;
  scopes: string[];
  expiresAt?: number;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  error?: WhatsAppValidateTokenError;
};

export async function validateWhatsAppToken(
  environment: IEnvironment,
  body: { accessToken: string; phoneNumberIdentification?: string; businessAccountId?: string },
  signal?: AbortSignal
): Promise<WhatsAppValidateTokenResponse> {
  const response = await post<{ data: WhatsAppValidateTokenResponse }>('/integrations/whatsapp/validate-token', {
    environment,
    body,
    signal,
  });

  return response.data;
}

export type ConfigureWhatsAppWebhookFailure = {
  code:
    | 'missing_management_scope'
    | 'missing_credentials'
    | 'missing_verify_token'
    | 'missing_app_secret'
    | 'app_subscription_failed'
    | 'meta_rejected'
    | 'unknown';
  message: string;
};

export type ConfigureWhatsAppWebhookResponse = {
  success: boolean;
  callbackUrl: string;
  wabaId?: string;
  fallbackToManual?: boolean;
  reason?: ConfigureWhatsAppWebhookFailure;
};

export async function configureAgentWhatsAppWebhook(
  environment: IEnvironment,
  agentIdentifier: string,
  integrationIdentifier: string
): Promise<ConfigureWhatsAppWebhookResponse> {
  const response = await post<{ data: ConfigureWhatsAppWebhookResponse }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationIdentifier)}/whatsapp/auto-configure`,
    { environment }
  );

  return response.data;
}

export type SendWhatsAppTestTemplateError = {
  code:
    | 'missing_credentials'
    | 'recipient_not_allowed'
    | 'token_expired'
    | 'template_unavailable'
    | 'invalid_recipient'
    | 'rate_limited'
    | 'meta_rejected'
    | 'unknown';
  message: string;
  helpUrl?: string;
};

export type SendWhatsAppTestTemplateResponse = {
  success: boolean;
  messageId?: string;
  error?: SendWhatsAppTestTemplateError;
};

export async function sendWhatsAppTestTemplate(
  environment: IEnvironment,
  agentIdentifier: string,
  integrationIdentifier: string,
  to: string
): Promise<SendWhatsAppTestTemplateResponse> {
  const response = await post<{ data: SendWhatsAppTestTemplateResponse }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationIdentifier)}/whatsapp/test-template`,
    { environment, body: { to } }
  );

  return response.data;
}

export type ConfigureTelegramWebhookResult = {
  webhookUrl: string;
  configuredAt: string;
  botUsername: string;
};

type ConfigureTelegramWebhookEnvelope = { data: ConfigureTelegramWebhookResult };

export async function configureTelegramAgentWebhook(
  environment: IEnvironment,
  agentIdentifier: string,
  integrationId: string
): Promise<ConfigureTelegramWebhookResult> {
  const response = await post<ConfigureTelegramWebhookEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationId)}/telegram/configure`,
    { environment }
  );

  return response.data;
}

export type TelegramMobileLink = {
  token: string;
  url: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
};

type TelegramMobileLinkEnvelope = { data: TelegramMobileLink };

export async function requestTelegramMobileLink(
  environment: IEnvironment,
  agentIdentifier: string,
  integrationId: string,
  subscriberId?: string
): Promise<TelegramMobileLink> {
  const response = await post<TelegramMobileLinkEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationId)}/telegram/mobile-link`,
    { environment, body: subscriberId ? { subscriberId } : undefined }
  );

  return response.data;
}

export type TelegramSubscriberLink = {
  deepLinkUrl: string;
  botUsername: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
};

type TelegramSubscriberLinkEnvelope = { data: TelegramSubscriberLink };

/**
 * Issues a `t.me/<bot>?start=<code>` deep-link that, when opened by a subscriber,
 * automatically links the originating Telegram chat to the supplied subscriberId
 * by creating a `telegram_chat` channel endpoint on the bot inbound webhook.
 */
export async function requestTelegramSubscriberLink(
  environment: IEnvironment,
  agentIdentifier: string,
  integrationId: string,
  subscriberId: string
): Promise<TelegramSubscriberLink> {
  const response = await post<TelegramSubscriberLinkEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(integrationId)}/telegram/subscriber-link`,
    { environment, body: { subscriberId } }
  );

  return response.data;
}

export type TelegramMobileLinkStatus =
  | { valid: true; agentName: string; providerName: string }
  | { valid: false; reason: 'expired' | 'used' | 'invalid' };

/**
 * Public, unauthenticated request. Used by the mobile landing page where the
 * visitor does not have a Clerk session.
 */
export async function getTelegramMobileSetupStatus(
  token: string,
  signal?: AbortSignal
): Promise<TelegramMobileLinkStatus> {
  const url = `${getApiBaseUrl()}/v1/agents/public/telegram/mobile-configure/status?token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new NovuApiError(extractErrorMessage(data) ?? 'Failed to load setup link', response.status, data);
  }

  return unwrapEnvelope(data) as TelegramMobileLinkStatus;
}

export type SubmitTelegramMobileCredentialsResult = {
  success: true;
  botUsername: string;
  webhookUrl: string;
  /** Present when the mobile link was issued with a subscriberId. */
  deepLinkUrl?: string;
};

export type SubmitTelegramMobileCredentialsError = {
  code: 'token_invalid' | 'token_expired' | 'token_already_used' | 'unknown';
  message: string;
};

export class TelegramMobileSubmitError extends Error {
  constructor(
    public readonly code: SubmitTelegramMobileCredentialsError['code'],
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function submitTelegramMobileCredentials(
  token: string,
  botToken: string
): Promise<SubmitTelegramMobileCredentialsResult> {
  const url = `${getApiBaseUrl()}/v1/agents/public/telegram/mobile-configure`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, botToken }),
  });

  const data = await safeJson(response);

  if (!response.ok) {
    const code = extractErrorCode(data);
    const message = extractErrorMessage(data) ?? 'Failed to configure Telegram bot';
    throw new TelegramMobileSubmitError(code, message, response.status);
  }

  return unwrapEnvelope(data) as SubmitTelegramMobileCredentialsResult;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * The API's global ResponseInterceptor wraps every successful body in `{ data: ... }`.
 * Our authed `post`/`get` helpers go through `api.client` which unwraps it, but the
 * public mobile flow uses raw `fetch` and must unwrap manually.
 */
function unwrapEnvelope(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as { data: unknown }).data;
  }

  return data;
}

function extractErrorMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && 'message' in (message as object)) {
      const inner = (message as { message: unknown }).message;

      return typeof inner === 'string' ? inner : undefined;
    }
  }

  return undefined;
}

function extractErrorCode(data: unknown): SubmitTelegramMobileCredentialsError['code'] {
  if (!data || typeof data !== 'object') return 'unknown';

  // Nest's HttpException with object payload nests the response under `message`.
  const message = (data as { message?: unknown }).message;
  const candidate =
    typeof message === 'object' && message !== null && 'code' in (message as object)
      ? (message as { code?: unknown }).code
      : (data as { code?: unknown }).code;

  if (candidate === 'token_invalid' || candidate === 'token_expired' || candidate === 'token_already_used') {
    return candidate;
  }

  return 'unknown';
}
