import type {
  AgentCreationSourceEnum,
  AgentRuntime,
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  DirectionEnum,
  IEnvironment,
} from '@novu/shared';
import { del, get, patch, post } from '@/api/api.client';

/** Root segment for TanStack Query keys; use with {@link getAgentsListQueryKey}. */
export const AGENTS_LIST_QUERY_KEY = 'fetchAgents' as const;

const AGENT_DETAIL_QUERY_KEY = 'fetchAgent' as const;

const AGENT_INTEGRATIONS_QUERY_KEY = 'fetchAgentIntegrations' as const;

const AGENT_EMOJI_QUERY_KEY = 'fetchAgentEmoji' as const;

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
  creationSource?: AgentCreationSourceEnum;
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
