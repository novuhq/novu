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

export type AgentSkillDto = {
  /** 'anthropic' for Anthropic-managed skills, 'custom' for user-created skills */
  type: 'anthropic' | 'custom';
  /** Skill identifier, e.g. "xlsx" for Anthropic skills or "skill_01XJ5..." for custom */
  skillId: string;
  /** Version to pin. Omit to use latest. */
  version?: string | null;
};

/**
 * Payload shape used when creating a new managed-runtime agent.
 * `tools`, `mcpServers`, and `skills` are optional initial selections applied at provisioning time.
 */
export type CreateManagedRuntimeDto = {
  providerId: AgentRuntimeProviderIdEnum;
  integrationId: string;
  model?: string;
  systemPrompt?: string;
  /** Tool `type` strings to enable on the new agent (e.g. 'web_search'). */
  tools?: string[];
  /** MCP server IDs to attach to the new agent (must match ClaudeMcpServer.id). */
  mcpServers?: string[];
  /** Skills to attach to the new agent. Maximum 20. */
  skills?: AgentSkillDto[];
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
  skills: AgentSkillDto[];
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
