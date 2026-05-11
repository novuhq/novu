import type {
  AgentMcpServerDto,
  AgentRuntimeCapabilities,
  AgentRuntimeConfigDto,
  AgentRuntimeProviderIdEnum,
  AgentSkillDto,
  AgentToolDto,
} from '@novu/shared';

export type CreateAgentInput = {
  name: string;
  model?: string;
  systemPrompt?: string;
  /** Builtin tool type strings, e.g. 'web_search', 'bash' */
  tools?: string[];
  /** MCP server catalog entries resolved to {name, url} pairs */
  mcpServers?: Array<{ name: string; url: string }>;
  /** Skills to attach to the agent at creation time. Maximum 20. */
  skills?: AgentSkillDto[];
};

export type CreateAgentResult = {
  externalAgentId: string;
};

export type UpdateAgentRuntimeConfigInput = {
  model?: string;
  systemPrompt?: string;
  mcpServers?: AgentMcpServerDto[];
  tools?: AgentToolDto[];
  skills?: AgentSkillDto[];
};

export interface IAgentRuntimeProvider {
  readonly providerId: AgentRuntimeProviderIdEnum;
  readonly capabilities: AgentRuntimeCapabilities;

  /**
   * Validate the supplied credentials against the provider's API.
   * Throws AgentRuntimeUnauthorizedError / AgentRuntimeForbiddenError on failure.
   */
  validateCredentials(apiKey: string): Promise<void>;

  /**
   * Create a new agent on the provider side.
   * Returns the stable external agent ID we persist on AgentEntity.managedRuntime.
   */
  createAgent(input: CreateAgentInput): Promise<CreateAgentResult>;

  /**
   * Permanently delete the agent on the provider side.
   * Best-effort — callers should still proceed with local cleanup on error.
   */
  deleteAgent(externalAgentId: string): Promise<void>;

  /**
   * Fetch all live configuration for the agent from the provider.
   * Never cached — always goes to the provider API.
   */
  getConfig(externalAgentId: string): Promise<AgentRuntimeConfigDto>;

  /**
   * Apply a partial config update to the provider.
   * The provider class is responsible for diffing and issuing the minimal set of API calls.
   * Returns the full updated config.
   */
  updateConfig(externalAgentId: string, patch: UpdateAgentRuntimeConfigInput): Promise<AgentRuntimeConfigDto>;
}
