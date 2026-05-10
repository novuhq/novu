import type { AgentRuntime, AgentRuntimeCapabilities, IEnvironment } from '@novu/shared';
import { get, patch } from '@/api/api.client';

// ─── Query key helpers ───────────────────────────────────────────────────────

const AGENT_RUNTIME_PROVIDERS_QUERY_KEY = 'fetchAgentRuntimeProviders' as const;
const AGENT_RUNTIME_CONFIG_QUERY_KEY = 'fetchAgentRuntimeConfig' as const;

export function getAgentRuntimeProvidersQueryKey() {
  return [AGENT_RUNTIME_PROVIDERS_QUERY_KEY] as const;
}

export function getAgentRuntimeConfigQueryKey(environmentId: string | undefined, agentIdentifier: string | undefined) {
  return [AGENT_RUNTIME_CONFIG_QUERY_KEY, environmentId, agentIdentifier] as const;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentRuntimeProviderResponse = {
  providerId: string;
  displayName: string;
  docsUrl?: string;
  statusUrl?: string;
  comingSoon?: boolean;
  capabilities: AgentRuntimeCapabilities;
};

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

export type AgentRuntimeConfig = {
  model: string;
  systemPrompt: string;
  mcpServers: AgentMcpServer[];
  tools: AgentTool[];
};

export type PatchAgentRuntimeConfigBody = {
  model?: string;
  systemPrompt?: string;
  mcpServers?: AgentMcpServer[];
  tools?: AgentTool[];
};

export type AgentRuntimeError = {
  statusCode: number;
  code: string;
  providerId: string;
  message: string;
  retryAfterMs?: number;
  requestId?: string;
};

// ─── API functions ───────────────────────────────────────────────────────────

/**
 * Fetches the static catalog of supported agent runtime providers.
 * Used to render capability-driven UI panels (MCP, tools, model, system prompt).
 */
export async function getAgentRuntimeProviders(
  environment: IEnvironment,
  signal?: AbortSignal
): Promise<AgentRuntimeProviderResponse[]> {
  const response = await get<{ data: AgentRuntimeProviderResponse[] }>('/agents/runtime-providers', {
    environment,
    signal,
  });

  return response.data;
}

/**
 * Fetches live runtime configuration for a managed agent from the provider.
 * Returns 422 for self-hosted agents.
 */
export async function getAgentRuntimeConfig(
  environment: IEnvironment,
  agentIdentifier: string,
  signal?: AbortSignal
): Promise<AgentRuntimeConfig> {
  const response = await get<{ data: AgentRuntimeConfig }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/runtime/config`,
    { environment, signal }
  );

  return response.data;
}

/**
 * Applies a partial update to the managed agent runtime config on the provider.
 */
export async function updateAgentRuntimeConfig(
  environment: IEnvironment,
  agentIdentifier: string,
  body: PatchAgentRuntimeConfigBody
): Promise<AgentRuntimeConfig> {
  const response = await patch<{ data: AgentRuntimeConfig }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/runtime/config`,
    { environment, body }
  );

  return response.data;
}

// ─── Extended agent types (augment existing AgentResponse) ───────────────────

export type ManagedRuntimeInfo = {
  providerId: string;
  integrationId: string;
  externalAgentId: string;
};

export type AgentRuntimeInfo = {
  runtime?: AgentRuntime;
  managedRuntime?: ManagedRuntimeInfo;
};
