import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk';
import type { AgentMcpServerDto, AgentRuntimeConfigDto, AgentSkillDto, AgentToolDto } from '@novu/shared';
import {
  AGENT_RUNTIME_PROVIDERS,
  AgentRuntimeCapabilities,
  AgentRuntimeProviderIdEnum,
  CLAUDE_BUILTIN_TOOLS,
} from '@novu/shared';
import { BaseAgentRuntimeProvider } from '../base-agent-runtime.provider';
import {
  AgentRuntimeBadRequestError,
  AgentRuntimeForbiddenError,
  AgentRuntimeNetworkError,
  AgentRuntimeNotFoundError,
  AgentRuntimeOverloadedError,
  AgentRuntimeRateLimitedError,
  AgentRuntimeServiceUnavailableError,
  AgentRuntimeTimeoutError,
  AgentRuntimeUnauthorizedError,
  AgentRuntimeUnknownError,
} from '../errors';
import type {
  CreateAgentInput,
  CreateAgentResult,
  DeleteVaultCredentialInput,
  GetAgentResult,
  GetEnvironmentResult,
  ParsedMcpInitFailure,
  PendingToolApproval,
  ProvisionIntegrationInput,
  ProvisionIntegrationResult,
  UpdateAgentRuntimeConfigInput,
  UpsertVaultCredentialInput,
  UpsertVaultCredentialResult,
  VaultCredentialAuth,
} from '../i-agent-runtime-provider';

const PROVIDER_ID = AgentRuntimeProviderIdEnum.Anthropic;
const DEFAULT_MODEL = 'claude-sonnet-4-5';
/** Single retry jitter window in ms */
const RETRY_JITTER_MS = 500;
/** Timeout for config calls in ms */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Anthropic surfaces missing MCP credentials, URL mismatches, and "not yet
 * registered" cases as stream errors with the message shape
 * `MCP server '<displayName>' initialize failed: ...`. Thalamus's
 * `mapSessionError` wraps these in a generic retryable `ThalamusError`, so
 * the worker needs a stable parser to lift the server name out — we keep
 * the regex here (the only Anthropic-specific knowledge required) so the
 * worker stays runtime-agnostic.
 */
const MCP_INIT_ERROR_PATTERN = /^MCP server '([^']+)' initialize failed/;

export class AnthropicAgentRuntimeProvider extends BaseAgentRuntimeProvider {
  readonly providerId = PROVIDER_ID;

  readonly capabilities: AgentRuntimeCapabilities = AGENT_RUNTIME_PROVIDERS.find(
    (p) => p.providerId === PROVIDER_ID
  ).capabilities;

  constructor(private readonly _apiKey: string) {
    super();
  }

  private buildClient(apiKey: string = this._apiKey): Anthropic {
    return new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });
  }

  private normaliseError(err: unknown): never {
    if (err instanceof APIConnectionTimeoutError) {
      throw new AgentRuntimeTimeoutError(err.message, PROVIDER_ID);
    }

    if (err instanceof APIConnectionError) {
      throw new AgentRuntimeNetworkError(err.message, PROVIDER_ID);
    }

    if (err instanceof APIError) {
      const requestId = err.requestID ?? err.headers?.get?.('request-id') ?? undefined;

      if (err.status === 401) {
        throw new AgentRuntimeUnauthorizedError(err.message, PROVIDER_ID, requestId);
      }
      if (err.status === 403) {
        throw new AgentRuntimeForbiddenError(err.message, PROVIDER_ID, requestId);
      }
      if (err.status === 404) {
        throw new AgentRuntimeNotFoundError(err.message, PROVIDER_ID, requestId);
      }
      if (err.status === 429) {
        const retryAfterMs = parseRetryAfter(err.headers?.get?.('retry-after') ?? undefined);

        throw new AgentRuntimeRateLimitedError(err.message, PROVIDER_ID, retryAfterMs, requestId);
      }
      if (err.status === 529) {
        throw new AgentRuntimeOverloadedError(err.message, PROVIDER_ID, requestId);
      }
      if (err.status >= 500) {
        throw new AgentRuntimeServiceUnavailableError(err.message, PROVIDER_ID, requestId);
      }
      if (err.status === 400 || err.status === 422) {
        throw new AgentRuntimeBadRequestError(err.message, PROVIDER_ID, requestId);
      }
    }

    throw new AgentRuntimeUnknownError(err instanceof Error ? err.message : 'Unknown error', PROVIDER_ID);
  }

  /** Wraps an async call with a single retry (with jitter) for transient errors. */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (isTransient(err)) {
        await sleep(Math.random() * RETRY_JITTER_MS);

        return fn();
      }
      throw err;
    }
  }

  async validateCredentials(apiKey: string): Promise<void> {
    const client = this.buildClient(apiKey);
    try {
      // A cheap read-only call to verify the key
      await client.models.list({ limit: 1 });
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
    const client = this.buildClient();

    // Not retried: agent creation is not idempotent and a retry after a
    // dropped response would create a duplicate billable agent upstream.
    try {
      const toolsPayload = buildToolsPayload(input.tools, input.mcpServers);

      const agent = await (client as any).beta.agents.create({
        name: input.name,
        model: input.model ?? DEFAULT_MODEL,
        ...(input.systemPrompt ? { system: input.systemPrompt } : {}),
        ...(input.mcpServers && input.mcpServers.length > 0
          ? { mcp_servers: input.mcpServers.map((s) => ({ name: s.name, type: 'url', url: s.url })) }
          : {}),
        ...(toolsPayload.length > 0 ? { tools: toolsPayload } : {}),
        ...(input.skills && input.skills.length > 0 ? { skills: input.skills.map(toSkillParam) } : {}),
      });

      return { externalAgentId: agent.id as string };
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async getAgent(externalAgentId: string): Promise<GetAgentResult> {
    const client = this.buildClient();

    return this.withRetry(async () => {
      try {
        const agent = await client.beta.agents.retrieve(externalAgentId);

        return { externalAgentId: agent.id as string, name: agent.name as string };
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async getEnvironment(externalEnvironmentId: string): Promise<GetEnvironmentResult> {
    const client = this.buildClient();

    try {
      const env = await client.beta.environments.retrieve(externalEnvironmentId);

      return {
        id: env.id,
        name: env.name,
      };
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async deleteAgent(externalAgentId: string): Promise<void> {
    const client = this.buildClient();

    await this.withRetry(async () => {
      try {
        await client.beta.agents.archive(externalAgentId);
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async getConfig(externalAgentId: string): Promise<AgentRuntimeConfigDto> {
    const client = this.buildClient();

    return this.withRetry(async () => {
      try {
        const agent = await (client as any).beta.agents.retrieve(externalAgentId);

        return {
          model: agent.model?.id ?? agent.model ?? DEFAULT_MODEL,
          systemPrompt: agent.system ?? '',
          mcpServers: ((agent.mcp_servers as any[]) ?? []).map(mapMcpServer),
          tools: ((agent.tools as any[]) ?? []).flatMap(mapToolset),
          skills: ((agent.skills as any[]) ?? []).map(mapSkill),
        };
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async updateConfig(externalAgentId: string, patch: UpdateAgentRuntimeConfigInput): Promise<AgentRuntimeConfigDto> {
    const client = this.buildClient();

    return this.withRetry(async () => {
      try {
        // Retrieve the current agent once: we need its `version` for the optimistic
        // concurrency control the Anthropic API requires on every update, and its
        // `tools` / `mcp_servers` to merge partial patches without clearing the
        // side the caller didn't touch.
        const currentAgent = await (client as any).beta.agents.retrieve(externalAgentId);

        const updatePayload: Record<string, unknown> = {
          version: currentAgent.version,
        };

        if (patch.model !== undefined) updatePayload.model = patch.model;
        if (patch.systemPrompt !== undefined) updatePayload.system = patch.systemPrompt;
        if (patch.mcpServers !== undefined) {
          updatePayload.mcp_servers = patch.mcpServers.map((s) => ({ name: s.name, type: 'url', url: s.url }));
        }
        if (patch.tools !== undefined || patch.mcpServers !== undefined) {
          const currentTools = ((currentAgent.tools as any[]) ?? []).flatMap(mapToolset);
          const currentMcpServers = ((currentAgent.mcp_servers as any[]) ?? []).map(mapMcpServer);
          // Use externalId (the provider tool `type`, e.g. "bash"), not the display `name`
          // (e.g. "Bash") — the latter never matches CLAUDE_BUILTIN_TOOLS, leaving every
          // tool disabled in the toolset payload.
          const toolTypes =
            patch.tools !== undefined ? patch.tools.map((t) => t.externalId) : currentTools.map((t) => t.externalId);
          const mcpServers =
            patch.mcpServers !== undefined
              ? patch.mcpServers.map((s) => ({ name: s.name, url: s.url }))
              : currentMcpServers.map((s) => ({ name: s.name, url: s.url }));
          const toolsPayload = buildToolsPayload(toolTypes, mcpServers);

          if (toolsPayload.length > 0) updatePayload.tools = toolsPayload;
        }
        if (patch.skills !== undefined) {
          updatePayload.skills = patch.skills.map(toSkillParam);
        }

        const updated = await (client as any).beta.agents.update(externalAgentId, updatePayload);

        return {
          model: updated.model?.id ?? updated.model ?? DEFAULT_MODEL,
          systemPrompt: updated.system ?? '',
          mcpServers: ((updated.mcp_servers as any[]) ?? []).map(mapMcpServer),
          tools: ((updated.tools as any[]) ?? []).flatMap(mapToolset),
          skills: ((updated.skills as any[]) ?? []).map(mapSkill),
        };
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async provisionIntegration(input: ProvisionIntegrationInput): Promise<ProvisionIntegrationResult> {
    const client = this.buildClient();

    // Not retried: environment creation is not idempotent.
    const env: { id: string } = await (async () => {
      try {
        return await (client as any).beta.environments.create({
          name: `nv-${input.integrationName}`,
          config: {
            type: 'cloud',
            networking: { type: 'unrestricted' },
          },
        });
      } catch (err) {
        this.normaliseError(err);
      }
    })();

    // Anthropic vaults are a separate top-level resource from environments,
    // so we eager-provision one alongside each integration. Doing it here keeps
    // every "find the vlt_… for this integration" lookup constant-time on the
    // hot path (OAuth callback) — we just read `externalVaultId` off the
    // already-decrypted credentials blob.
    const vault: { id: string } = await (async () => {
      try {
        return await (client as any).beta.vaults.create({
          display_name: `nv-${input.integrationName}-vault`,
        });
      } catch (err) {
        // Best-effort rollback so we don't leak an orphan environment when
        // the vault create fails. If the rollback itself fails the
        // environment is archived later by ops; the original error is what
        // surfaces.
        try {
          await (client as any).beta.environments.archive(env.id);
        } catch {
          // swallow — original error is more useful
        }
        this.normaliseError(err);
      }
    })();

    return {
      credentialsUpdate: {
        externalEnvironmentId: env.id,
        externalVaultId: vault.id,
      },
      metadata: {},
    };
  }

  async deprovisionIntegration(credentialsUpdate: Record<string, unknown>): Promise<void> {
    const externalEnvironmentId = credentialsUpdate.externalEnvironmentId as string | undefined;
    const externalVaultId = credentialsUpdate.externalVaultId as string | undefined;

    if (!externalEnvironmentId && !externalVaultId) {
      return;
    }

    const client = this.buildClient();

    if (externalEnvironmentId) {
      await this.withRetry(async () => {
        try {
          await (client as any).beta.environments.archive(externalEnvironmentId);
        } catch (err) {
          this.normaliseError(err);
        }
      });
    }

    if (externalVaultId) {
      await this.withRetry(async () => {
        try {
          await (client as any).beta.vaults.archive(externalVaultId);
        } catch (err) {
          this.normaliseError(err);
        }
      });
    }
  }

  async getPendingToolApproval(sessionId: string): Promise<PendingToolApproval | null> {
    const client = this.buildClient();

    try {
      // Walk the session event log oldest-first looking for an MCP or
      // builtin tool_use event whose evaluated_permission is "ask" — that's
      // what parks the session in `requires_action`. The provider contract
      // asks for the SINGLE OLDEST PENDING ask, so we must scan ascending
      // and pick the first match (a descending walk would surface the
      // newest unresolved ask instead). The `user.tool_confirmation`
      // sentinel still short-circuits — if we encounter a confirmation
      // event before any later ask, that confirmation already resolved a
      // prior pending request and there's nothing left to ask the user.
      const iterator = (client as any).beta.sessions.events.list(sessionId, {
        order: 'asc',
        types: ['agent.mcp_tool_use', 'agent.tool_use', 'user.tool_confirmation'],
      });

      for await (const event of iterator) {
        if (event?.type === 'user.tool_confirmation') {
          // A confirmation event encountered during an ascending walk
          // resolves the most-recent prior ask — continue scanning so a
          // later still-open ask can be surfaced.
          continue;
        }

        if (event?.evaluated_permission !== 'ask') {
          continue;
        }

        const toolUseId = event.id as string | undefined;
        const toolName = (event.name as string | undefined) ?? 'unknown_tool';

        if (!toolUseId) {
          continue;
        }

        return {
          toolUseId,
          toolName,
          mcpServerName: event.type === 'agent.mcp_tool_use' ? (event.mcp_server_name as string) : undefined,
          input: (event.input as Record<string, unknown> | undefined) ?? undefined,
        };
      }

      return null;
    } catch (err) {
      this.normaliseError(err);
    }
  }

  parseMcpInitFailure(err: unknown): ParsedMcpInitFailure | null {
    // Inspect the error message only — we deliberately avoid coupling this
    // module to `@novu/thalamus`'s ThalamusError class so the abstraction
    // stays light. Anything in the codebase that surfaces this exact wire
    // text was originally produced by Anthropic's streaming MCP-init path.
    const message = (err as { message?: unknown } | null)?.message;

    if (typeof message !== 'string') {
      return null;
    }

    const match = message.match(MCP_INIT_ERROR_PATTERN);

    if (!match) {
      return null;
    }

    return { mcpServerName: match[1] };
  }

  async upsertVaultCredential(input: UpsertVaultCredentialInput): Promise<UpsertVaultCredentialResult> {
    const client = this.buildClient();

    // Eager provisioning is the happy path (see `provisionIntegration`).
    // Legacy integrations that pre-date vault eager-creation, or any flow
    // where the integration credentials lost their `externalVaultId`, fall
    // through to in-flight lazy creation. We hand the new id back to the
    // caller via `integrationCredentialsUpdate` so the OAuth callback can
    // persist it on the integration in the same transaction.
    let vaultId = (input.integrationCredentials.externalVaultId as string | undefined) ?? undefined;
    let integrationCredentialsUpdate: Record<string, unknown> | undefined;
    let lazyCreatedVault = false;

    if (!vaultId) {
      vaultId = await this.createVaultForIntegration(client, input.integrationCredentials);
      integrationCredentialsUpdate = { externalVaultId: vaultId };
      lazyCreatedVault = true;
    }

    // Vault credentials are vault-scoped on Anthropic's side, so an
    // `existingCredentialId` recorded against a previous (now-orphan) vault
    // would 404 on update. When we just lazy-created a fresh vault, ignore
    // the stale id and take the create branch so the caller's connection
    // row gets re-pointed at the new credential.
    const existingCredentialId = lazyCreatedVault ? undefined : input.existingCredentialId;

    return this.withRetry(async () => {
      try {
        if (existingCredentialId) {
          const updated = await (client as any).beta.vaults.credentials.update(existingCredentialId, {
            vault_id: vaultId,
            display_name: input.displayName,
            auth: buildMcpOAuthUpdateAuth(input.auth),
          });

          return { vaultCredentialId: updated.id as string, integrationCredentialsUpdate };
        }

        const created = await (client as any).beta.vaults.credentials.create(vaultId, {
          display_name: input.displayName,
          auth: buildMcpOAuthCreateAuth(input.mcpServerUrl, input.auth),
        });

        return { vaultCredentialId: created.id as string, integrationCredentialsUpdate };
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  /**
   * Create a vault on the fly for a legacy integration that wasn't provisioned
   * with one. Not retried at this layer: if the create fails we let the caller
   * see the underlying error so they can mark the connection as `error`.
   */
  private async createVaultForIntegration(
    client: Anthropic,
    integrationCredentials: Record<string, unknown>
  ): Promise<string> {
    const envHint = integrationCredentials.externalEnvironmentId as string | undefined;
    const displayName = envHint ? `nv-${envHint}-vault` : `nv-vault-${Date.now()}`;

    try {
      const vault = await (client as any).beta.vaults.create({ display_name: displayName });

      return vault.id as string;
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async deleteVaultCredential(input: DeleteVaultCredentialInput): Promise<void> {
    const vaultId = (input.integrationCredentials.externalVaultId as string | undefined) ?? undefined;

    // No vault provisioned (legacy integration provisioned before tokenVault
    // shipped) — nothing upstream to delete, callers proceed with local
    // cleanup. We only hard-fail in `upsert` because writing a credential
    // without a vault is genuinely broken.
    if (!vaultId) {
      return;
    }

    const client = this.buildClient();

    await this.withRetry(async () => {
      try {
        await (client as any).beta.vaults.credentials.delete(input.vaultCredentialId, { vault_id: vaultId });
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }
}

export function createAnthropicProvider(apiKey: string): AnthropicAgentRuntimeProvider {
  return new AnthropicAgentRuntimeProvider(apiKey);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parseRetryAfter(header: string | undefined | null): number {
  if (!header) return 60_000;
  const seconds = parseFloat(header);
  if (!Number.isNaN(seconds)) return Math.round(seconds * 1000);

  // RFC 9110 allows HTTP-date form
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());

  return 60_000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransient(err: unknown): boolean {
  return (
    err instanceof AgentRuntimeServiceUnavailableError ||
    err instanceof AgentRuntimeTimeoutError ||
    err instanceof AgentRuntimeNetworkError ||
    err instanceof AgentRuntimeOverloadedError
  );
}

function mapSkill(raw: Record<string, unknown>): AgentSkillDto {
  return {
    type: raw.type as 'anthropic' | 'custom',
    skillId: raw.skill_id as string,
    version: (raw.version as string | null | undefined) ?? null,
  };
}

function toSkillParam(skill: AgentSkillDto): Record<string, unknown> {
  return {
    type: skill.type,
    skill_id: skill.skillId,
    ...(skill.version != null ? { version: skill.version } : {}),
  };
}

function mapMcpServer(raw: Record<string, unknown>): AgentMcpServerDto {
  return {
    externalId: (raw.name as string) ?? '',
    name: raw.name as string,
    url: raw.url as string,
  };
}

/**
 * The agent response `tools` array contains toolset objects, not plain tool entries.
 * Flatten them into individual AgentToolDto entries for our internal representation.
 */
function mapToolset(raw: Record<string, unknown>): AgentToolDto[] {
  if (raw.type === 'agent_toolset_20260401') {
    return ((raw.configs as any[]) ?? [])
      .filter((c) => c.enabled !== false)
      .map((c) => ({
        externalId: c.name as string,
        name: c.name as string,
        type: 'builtin' as const,
      }));
  }

  if (raw.type === 'mcp_toolset') {
    return [
      {
        externalId: raw.mcp_server_name as string,
        name: raw.mcp_server_name as string,
        type: 'custom' as const,
      },
    ];
  }

  return [];
}

/**
 * Build the Anthropic `tools` payload array from builtin tool type strings
 * and optional MCP server entries.
 *
 * We always emit the full toolset with every known tool explicitly set to
 * enabled or disabled. Sending only the enabled subset causes the Anthropic
 * API to default all omitted tools to enabled, which means the agent ends up
 * with every tool regardless of what the user selected.
 */
function buildToolsPayload(
  toolTypes?: string[],
  mcpServers?: Array<{ name: string; url: string }>
): Record<string, unknown>[] {
  const hasTools = Array.isArray(toolTypes) && toolTypes.length > 0;
  const hasMcpServers = Array.isArray(mcpServers) && mcpServers.length > 0;

  if (!hasTools && !hasMcpServers) {
    return [];
  }

  const payload: Record<string, unknown>[] = [];

  const enabledSet = new Set(toolTypes ?? []);
  const allToolNames = CLAUDE_BUILTIN_TOOLS.map((t) => t.type);

  payload.push({
    type: 'agent_toolset_20260401',
    configs: allToolNames.map((name) => ({ name, enabled: enabledSet.has(name) })),
  });

  if (mcpServers) {
    for (const server of mcpServers) {
      payload.push({ type: 'mcp_toolset', mcp_server_name: server.name });
    }
  }

  return payload;
}

/**
 * Build the Anthropic `mcp_oauth` create payload. The `refresh` block is only
 * emitted when both a refresh token and the OAuth client metadata are present
 * — that's what enables Anthropic-side automated refresh; otherwise the vault
 * stores an access-only credential that Novu re-pushes on refresh.
 */
function buildMcpOAuthCreateAuth(mcpServerUrl: string, auth: VaultCredentialAuth): Record<string, unknown> {
  if (!auth.accessToken) {
    // The interface marks accessToken optional (delete flow), but create
    // semantically requires it. Surface as a programmer error.
    throw new Error('Anthropic vault credential create requires an access token');
  }

  const payload: Record<string, unknown> = {
    type: 'mcp_oauth',
    access_token: auth.accessToken,
    mcp_server_url: mcpServerUrl,
    expires_at: auth.expiresAt ?? null,
  };

  if (auth.refreshToken && auth.oauthClient) {
    payload.refresh = buildMcpOAuthRefreshParams(auth);
  }

  return payload;
}

function buildMcpOAuthUpdateAuth(auth: VaultCredentialAuth): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: 'mcp_oauth',
  };

  if (auth.accessToken !== undefined) payload.access_token = auth.accessToken;
  if (auth.expiresAt !== undefined) payload.expires_at = auth.expiresAt;

  if (auth.refreshToken && auth.oauthClient) {
    payload.refresh = buildMcpOAuthRefreshParams(auth);
  }

  return payload;
}

function buildMcpOAuthRefreshParams(auth: VaultCredentialAuth): Record<string, unknown> {
  // Caller guarantees both before invoking, but narrow defensively so we
  // never emit a half-built refresh block.
  if (!auth.refreshToken || !auth.oauthClient) {
    throw new Error('buildMcpOAuthRefreshParams requires refreshToken and oauthClient');
  }

  const { oauthClient } = auth;
  const tokenEndpointAuth = oauthClient.clientSecret
    ? { type: 'client_secret_post', client_secret: oauthClient.clientSecret }
    : { type: 'none' };

  return {
    client_id: oauthClient.clientId,
    refresh_token: auth.refreshToken,
    token_endpoint: oauthClient.tokenEndpoint,
    token_endpoint_auth: tokenEndpointAuth,
    resource: oauthClient.resource ?? null,
    scope: auth.scopes && auth.scopes.length > 0 ? auth.scopes.join(' ') : null,
  };
}
