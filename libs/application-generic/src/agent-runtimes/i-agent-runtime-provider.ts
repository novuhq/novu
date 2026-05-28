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
  /** Provider-side environment/vault name stem; defaults to integrationName. */
  resourceName?: string;
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

/**
 * OAuth client metadata recorded at authorize-URL time. Providers whose vault
 * supports server-side refresh (e.g. Anthropic's `mcp_oauth.refresh` block)
 * use this to register the upstream token endpoint with the vault so refreshes
 * can happen without round-tripping back through Novu.
 */
export interface VaultCredentialAuthOAuthClient {
  clientId: string;
  clientSecret?: string;
  tokenEndpoint: string;
  /** RFC 8707 resource indicator replayed verbatim on refresh. */
  resource?: string;
}

/**
 * Decoded credential payload pushed to a provider's vault.
 *
 * Mirrors `McpConnectionAuth` from `@novu/dal` but is intentionally redeclared
 * here so the provider abstraction stays independent of the persistence layer.
 * Callers decrypt before passing in.
 */
export interface VaultCredentialAuth {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scopes?: string[];
  oauthClient?: VaultCredentialAuthOAuthClient;
}

export interface CreateVaultInput {
  displayName: string;
}

export interface CreateVaultResult {
  externalVaultId: string;
}

export interface UpsertVaultCredentialInput {
  /**
   * Decrypted integration credentials blob kept provider-agnostic for API-key
   * access during vault operations.
   */
  integrationCredentials: Record<string, unknown>;
  /** Scoped Anthropic vault container (`vlt_…`) that owns this credential. */
  externalVaultId: string;
  /** Canonical MCP server URL the credential authorises. */
  mcpServerUrl: string;
  /** Human-readable label surfaced in the provider's vault UI. */
  displayName: string;
  /** Decrypted OAuth tokens issued by the upstream MCP authorization server. */
  auth: VaultCredentialAuth;
  /**
   * When set, update the existing vault credential instead of creating a new
   * one. Returned by a previous `upsertVaultCredential` call.
   */
  existingCredentialId?: string;
}

export interface UpsertVaultCredentialResult {
  /** Stable identifier for subsequent `update` / `delete` calls. */
  vaultCredentialId: string;
}

export interface DeleteVaultCredentialInput {
  /** Decrypted integration credentials blob; see `UpsertVaultCredentialInput`. */
  integrationCredentials: Record<string, unknown>;
  /** Scoped Anthropic vault container (`vlt_…`) that owns this credential. */
  externalVaultId: string;
  vaultCredentialId: string;
}

export interface ParsedMcpInitFailure {
  /** Catalog-side display name surfaced by the runtime (e.g. "Sentry"). */
  mcpServerName: string;
}

/**
 * Snapshot of a tool call the runtime is waiting on user approval for.
 *
 * Used by the worker when a turn ends in `requires-action` (e.g. Anthropic
 * MCP toolsets configured with `permission_policy: always_ask`) to materialise
 * an Approve/Deny card on the SDK side without coupling the worker to any
 * one provider's session-events shape.
 */
export interface PendingToolApproval {
  /** Provider-side event id (e.g. Anthropic `sevt_...`). */
  toolUseId: string;
  toolName: string;
  /** Set when the tool comes from an MCP toolset; undefined for builtin / custom tools. */
  mcpServerName?: string;
  /** Tool arguments — surfaced to the user so they can decide. */
  input?: Record<string, unknown>;
}

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

export type ValidateCredentialsInput = {
  apiKey?: string;
  region?: string;
  externalWorkspaceId?: string;
};

export interface IAgentRuntimeProvider {
  readonly providerId: AgentRuntimeProviderIdEnum;
  readonly capabilities: AgentRuntimeCapabilities;

  /**
   * Validate the supplied credentials against the provider's API.
   * Throws AgentRuntimeUnauthorizedError / AgentRuntimeForbiddenError on failure.
   */
  validateCredentials(input: ValidateCredentialsInput): Promise<void>;

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
   * Inspect an error surfaced by a streaming turn (or any provider-side call
   * that goes through MCP server initialisation) and decide whether it is
   * the "MCP X failed to initialize" shape that means the upstream credential
   * vault is missing/expired and the caller should prompt the user to
   * (re-)authorise the MCP.
   *
   * Returns `null` for anything else so the caller can fall through to its
   * generic retry/fallback path. Each provider owns its own error shape;
   * the abstraction never assumes a specific error class.
   */
  parseMcpInitFailure(err: unknown): ParsedMcpInitFailure | null;

  /**
   * Inspect a session that ended in `requires-action` (or was rejected for
   * "waiting on responses to events") and return every pending
   * tool-confirmation request, oldest first.
   *
   * Providers without a session-scoped event log return `[]`; callers fall
   * back to a generic error reply.
   */
  getAllPendingToolApprovals(sessionId: string): Promise<PendingToolApproval[]>;

  /**
   * Create an empty credential vault on the provider (Anthropic: `vlt_…`).
   * Only callable when `capabilities.tokenVault === true`.
   */
  createVault(input: CreateVaultInput): Promise<CreateVaultResult>;

  /**
   * Push an OAuth credential to the provider's per-environment vault so the
   * upstream MCP initialise step can succeed on the next turn.
   *
   * Only callable when `capabilities.tokenVault === true`. Providers without
   * a token vault fall back to having Novu inject the bearer per request —
   * use `BaseAgentRuntimeProvider`'s default, which throws
   * `UnsupportedCapabilityError`, to fail loudly if a caller forgets the
   * capability gate.
   */
  upsertVaultCredential(input: UpsertVaultCredentialInput): Promise<UpsertVaultCredentialResult>;

  /**
   * Delete a credential previously pushed via `upsertVaultCredential` (called
   * on disable / revoke). Only callable when `capabilities.tokenVault === true`.
   * Best-effort — callers should still proceed with local cleanup on error.
   */
  deleteVaultCredential(input: DeleteVaultCredentialInput): Promise<void>;

  /**
   * Upload a custom skill bundle to the provider and return a stable skillId
   * that can later be passed via `skills: [{ type: 'custom', skillId }]` on
   * createAgent / updateConfig.
   */
  uploadSkill(input: UploadSkillInput): Promise<UploadSkillResult>;
}
