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

export type GetAgentResult = {
  externalAgentId: string;
  name: string;
};

export type GetEnvironmentResult = {
  id: string;
  name: string;
};

export type UpdateAgentRuntimeConfigInput = {
  model?: string;
  systemPrompt?: string;
  mcpServers?: AgentMcpServerDto[];
  tools?: AgentToolDto[];
  skills?: AgentSkillDto[];
};

export type ProvisionIntegrationInput = {
  /** Human-readable name for the integration; used as the environment/resource name on the provider. */
  integrationName: string;
};

export type ProvisionIntegrationResult = {
  /**
   * Credential fields to merge into the integration's existing credentials.
   * For Anthropic this includes `externalEnvironmentId`.
   */
  credentialsUpdate: Record<string, unknown>;
  /** Optional provider-specific metadata (not stored in credentials). */
  metadata?: Record<string, unknown>;
};

export type UploadSkillFile = {
  /** Relative path of the file inside the skill bundle (e.g. 'SKILL.md', 'lib/helpers.py'). */
  path: string;
  /** Raw file bytes. */
  content: Buffer;
};

export type UploadSkillInput = {
  /** Files comprising the skill bundle. Must include a SKILL.md at the root. */
  files: UploadSkillFile[];
  /** Human-readable label for the skill on the provider side. */
  displayTitle?: string;
};

export type UploadSkillResult = {
  /** Stable provider-assigned skill identifier (e.g. 'skill_01XJ5...'). */
  skillId: string;
  /** Latest version identifier returned by the provider, when available. */
  version: string | null;
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
   * Fetch basic info (id + name) for an existing agent from the provider.
   *
   * Used in the "adopt existing agent" flow. A single call to this method is enough
   * to both validate that the API key is authorised (401 if not) AND confirm the
   * agent exists (404 if not), so there is no need to call validateCredentials() first.
   */
  getAgent(externalAgentId: string): Promise<GetAgentResult>;

  /**
   * Fetch environment information.
   */
  getEnvironment(externalEnvironmentId: string): Promise<GetEnvironmentResult>;

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

  /**
   * Provision any provider-side resources needed for an AGENT_RUNTIME integration
   * (e.g. a Claude environment). Called by CreateIntegration after the integration
   * record is saved. Returns a credentialsUpdate that is merged into the integration.
   */
  provisionIntegration(input: ProvisionIntegrationInput): Promise<ProvisionIntegrationResult>;

  /**
   * Tear down provider-side resources created by provisionIntegration.
   * Receives the same credentialsUpdate that provisionIntegration returned.
   * Best-effort — callers should still proceed with local cleanup on error.
   */
  deprovisionIntegration(credentialsUpdate: Record<string, unknown>): Promise<void>;

  /**
   * Upload a custom skill bundle to the provider and return a stable skillId
   * that can later be passed via `skills: [{ type: 'custom', skillId }]` on
   * createAgent / updateConfig.
   */
  uploadSkill(input: UploadSkillInput): Promise<UploadSkillResult>;
}
