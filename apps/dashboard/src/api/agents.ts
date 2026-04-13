import type { ChannelTypeEnum, DirectionEnum, IEnvironment } from '@novu/shared';
import { del, get, post } from '@/api/api.client';

/** Root segment for TanStack Query keys; use with {@link getAgentsListQueryKey}. */
export const AGENTS_LIST_QUERY_KEY = 'fetchAgents' as const;

export const AGENT_DETAIL_QUERY_KEY = 'fetchAgent' as const;

export function getAgentDetailQueryKey(environmentId: string | undefined, identifier: string | undefined) {
  return [AGENT_DETAIL_QUERY_KEY, environmentId, identifier] as const;
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

export type AgentResponse = {
  _id: string;
  name: string;
  identifier: string;
  description?: string;
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

export type CreateAgentBody = {
  name: string;
  identifier: string;
  description?: string;
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

export function deleteAgent(environment: IEnvironment, identifier: string): Promise<void> {
  return del(`/agents/${encodeURIComponent(identifier)}`, { environment });
}
