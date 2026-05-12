import type { AgentRuntime, IEnvironment } from '@novu/shared';
import { get, patch } from '@/api/api.client';

// ─── Query key helpers ───────────────────────────────────────────────────────

const AGENT_RUNTIME_CONFIG_QUERY_KEY = 'fetchAgentRuntimeConfig' as const;

export function getAgentRuntimeConfigQueryKey(environmentId: string | undefined, agentIdentifier: string | undefined) {
  return [AGENT_RUNTIME_CONFIG_QUERY_KEY, environmentId, agentIdentifier] as const;
}

// ─── Types ───────────────────────────────────────────────────────────────────

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

export type AgentSkill = {
  type: 'anthropic' | 'custom';
  skillId: string;
  version?: string | null;
};

export type AgentRuntimeConfig = {
  model: string;
  systemPrompt: string;
  mcpServers: AgentMcpServer[];
  tools: AgentTool[];
  skills?: AgentSkill[];
};

// For PATCH payloads, externalId may be absent when creating a new entry —
// the provider assigns it. Other fields stay the same shape as the read DTO.
export type PatchAgentMcpServer = Omit<AgentMcpServer, 'externalId'> & {
  externalId?: string;
};

export type PatchAgentTool = Omit<AgentTool, 'externalId'> & {
  externalId?: string;
};

export type PatchAgentRuntimeConfigBody = {
  model?: string;
  systemPrompt?: string;
  mcpServers?: PatchAgentMcpServer[];
  tools?: PatchAgentTool[];
  skills?: AgentSkill[];
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
