import { AgentRuntimeProviderIdEnum } from '../../consts/providers/agent-runtime-providers';

export type AgentRuntime = 'self-hosted' | 'managed';

export type ManagedRuntimeConfigDto = {
  /** The agent-runtime provider (e.g. 'anthropic') */
  providerId: AgentRuntimeProviderIdEnum;
  /** Internal Novu Integration._id that holds the encrypted API key */
  integrationId: string;
  /** The agent entity ID returned by the provider when the agent was provisioned */
  externalAgentId: string;
};

/**
 * Subset of agent runtime config fetched live from the provider.
 * Nothing here is persisted in Novu's database.
 */
export type AgentRuntimeConfigDto = {
  model: string;
  systemPrompt: string;
  mcpServers: AgentMcpServerDto[];
  tools: AgentToolDto[];
};

export type AgentMcpServerDto = {
  /** Provider-assigned ID for the MCP server */
  externalId: string;
  name: string;
  url: string;
  /** Optional token used to authenticate with the MCP server */
  authToken?: string;
};

export type AgentToolDto = {
  /** Provider-assigned ID for the tool */
  externalId: string;
  name: string;
  type: 'builtin' | 'custom';
  description?: string;
};
