import { APIConnectionError, APIConnectionTimeoutError, APIError, toFile } from '@anthropic-ai/sdk';
import type { AgentRuntimeConfigDto } from '@novu/shared';
import {
  AGENT_RUNTIME_PROVIDERS,
  AgentRuntimeCapabilities,
  AgentRuntimeProviderIdEnum,
  isAnthropicAwsProvider,
  NOVU_TOOLS_SCHEMA,
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
  CreateVaultInput,
  CreateVaultResult,
  DeleteVaultCredentialInput,
  GetAgentResult,
  GetEnvironmentResult,
  PendingToolApproval,
  ProvisionIntegrationInput,
  ProvisionIntegrationResult,
  UpdateAgentRuntimeConfigInput,
  UploadSkillFile,
  UploadSkillInput,
  UploadSkillResult,
  UpsertVaultCredentialInput,
  UpsertVaultCredentialResult,
  ValidateCredentialsInput,
  VaultCredentialAuth,
} from '../i-agent-runtime-provider';
import { type ResolvedAwsAnthropicCredentials } from './anthropic-aws-credentials';
import { AnthropicClientResolver } from './anthropic-client-resolver';
import { type AnthropicCompatibleClient } from './anthropic-cloud-client';
import {
  buildMcpOAuthCreateAuth,
  buildMcpOAuthUpdateAuth,
  buildToolsPayload,
  extractApiErrorMessage,
  extractSkillNameFromBundle,
  isDuplicateDisplayTitleError,
  isTransient,
  mapMcpServer,
  mapSkill,
  mapToolset,
  parseRetryAfter,
  sleep,
  toSkillParam,
  truncateWithEllipsis,
} from './anthropic-runtime.helpers';

export type AnthropicProviderInit = {
  providerId: AgentRuntimeProviderIdEnum;
  apiKey?: string;
  awsCredentials?: ResolvedAwsAnthropicCredentials;
};

const DEFAULT_MODEL = 'claude-sonnet-4-6';
/** Single retry jitter window in ms */
const RETRY_JITTER_MS = 500;
/** Anthropic enforces a 64-char cap on `display_title` for `beta.skills.create`. */
const MAX_DISPLAY_TITLE_LENGTH = 64;

export class AnthropicAgentRuntimeProvider extends BaseAgentRuntimeProvider {
  readonly providerId: AgentRuntimeProviderIdEnum;

  readonly capabilities: AgentRuntimeCapabilities;

  private readonly _apiKey?: string;
  private readonly clientResolver: AnthropicClientResolver;

  constructor(init: AnthropicProviderInit) {
    super();
    this.providerId = init.providerId;
    this.capabilities =
      AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === init.providerId)?.capabilities ??
      AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === AgentRuntimeProviderIdEnum.Anthropic)!.capabilities;

    if (isAnthropicAwsProvider(init.providerId)) {
      if (!init.awsCredentials) {
        throw new Error('AWS Claude credentials require region, workspace ID, and API key');
      }

      this.clientResolver = new AnthropicClientResolver(init.providerId, undefined, init.awsCredentials);
    } else {
      if (!init.apiKey) {
        throw new Error('Anthropic cloud provider requires an API key');
      }

      this._apiKey = init.apiKey;
      this.clientResolver = new AnthropicClientResolver(init.providerId, init.apiKey);
    }
  }

  private async getClient(input?: ValidateCredentialsInput) {
    return this.clientResolver.getClient(input);
  }

  private normaliseError(err: unknown): never {
    const providerId = this.providerId;

    if (err instanceof APIConnectionTimeoutError) {
      throw new AgentRuntimeTimeoutError(err.message, providerId);
    }

    if (err instanceof APIConnectionError) {
      throw new AgentRuntimeNetworkError(err.message, providerId);
    }

    if (err instanceof APIError) {
      const requestId = err.requestID ?? err.headers?.get?.('request-id') ?? undefined;
      const message = extractApiErrorMessage(err);

      if (err.status === 401) {
        throw new AgentRuntimeUnauthorizedError(message, providerId, requestId);
      }
      if (err.status === 403) {
        throw new AgentRuntimeForbiddenError(message, providerId, requestId);
      }
      if (err.status === 404) {
        throw new AgentRuntimeNotFoundError(message, providerId, requestId);
      }
      if (err.status === 429) {
        const retryAfterMs = parseRetryAfter(err.headers?.get?.('retry-after') ?? undefined);

        throw new AgentRuntimeRateLimitedError(message, providerId, retryAfterMs, requestId);
      }
      if (err.status === 529) {
        throw new AgentRuntimeOverloadedError(message, providerId, requestId);
      }
      if (err.status >= 500) {
        throw new AgentRuntimeServiceUnavailableError(message, providerId, requestId);
      }
      if (err.status === 400 || err.status === 422) {
        throw new AgentRuntimeBadRequestError(message, providerId, requestId);
      }
    }

    throw new AgentRuntimeUnknownError(err instanceof Error ? err.message : 'Unknown error', providerId);
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

  async validateCredentials(input: ValidateCredentialsInput): Promise<void> {
    const client = await this.getClient(input);
    try {
      // A cheap read-only call to verify the key
      await client.models.list({ limit: 1 });
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
    const client = await this.getClient();

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
    const client = await this.getClient();

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
    const client = await this.getClient();

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
    const client = await this.getClient();

    await this.withRetry(async () => {
      try {
        await client.beta.agents.archive(externalAgentId);
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async getConfig(externalAgentId: string): Promise<AgentRuntimeConfigDto> {
    const client = await this.getClient();

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
    const client = await this.getClient();

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
        if (patch.systemPrompt !== undefined) {
          updatePayload.system = patch.systemPrompt;
        }
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

  async refreshPlatformDefinition(externalAgentId: string): Promise<void> {
    const client = await this.getClient();

    await this.withRetry(async () => {
      try {
        // Read the agent's current user-selected tools/MCP and re-emit them through
        // buildToolsPayload, which always appends Novu-owned platform tools (e.g.
        // novu_tools). Nothing the user chose changes — this only backfills the overlay.
        const currentAgent = await (client as any).beta.agents.retrieve(externalAgentId);
        const rawTools = (currentAgent.tools as any[]) ?? [];
        const currentTools = rawTools.flatMap(mapToolset);
        const currentMcpServers = ((currentAgent.mcp_servers as any[]) ?? []).map(mapMcpServer);

        // Preserve any provider-side custom tools we don't own (e.g. on an adopted agent).
        // buildToolsPayload re-emits Novu's own novu_tools, so drop it here to avoid a duplicate.
        const foreignCustomTools = rawTools.filter(
          (tool) => tool?.type === 'custom' && tool?.name !== NOVU_TOOLS_SCHEMA.name
        );

        const toolsPayload = [
          ...buildToolsPayload(
            currentTools.map((t) => t.externalId),
            currentMcpServers.map((s) => ({ name: s.name, url: s.url }))
          ),
          ...foreignCustomTools,
        ];

        if (toolsPayload.length === 0) {
          return;
        }

        await (client as any).beta.agents.update(externalAgentId, {
          version: currentAgent.version,
          tools: toolsPayload,
        });
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async provisionIntegration(input: ProvisionIntegrationInput): Promise<ProvisionIntegrationResult> {
    const client = await this.getClient();
    const resourceStem = input.resourceName ?? input.integrationName;

    // Not retried: environment creation is not idempotent.
    const env: { id: string } = await (async () => {
      try {
        return await (client as any).beta.environments.create({
          name: `nv-${resourceStem}`,
          config: {
            type: 'cloud',
            networking: { type: 'unrestricted' },
          },
        });
      } catch (err) {
        this.normaliseError(err);
      }
    })();

    return {
      credentialsUpdate: {
        externalEnvironmentId: env.id,
      },
      metadata: {},
    };
  }

  async deprovisionIntegration(credentialsUpdate: Record<string, unknown>): Promise<void> {
    const externalEnvironmentId = credentialsUpdate.externalEnvironmentId as string | undefined;
    // `externalVaultId` on integration credentials is a legacy field from the
    // pre-subscriber-scope rollout (integration-level eager vault). New
    // provisioning paths don't set it, but historical integrations still
    // carry it — archive it here so disconnects don't leak the upstream
    // vault.
    const legacyExternalVaultId = credentialsUpdate.externalVaultId as string | undefined;

    if (!externalEnvironmentId && !legacyExternalVaultId) {
      return;
    }

    const client = await this.getClient();

    if (externalEnvironmentId) {
      await this.withRetry(async () => {
        try {
          await (client as any).beta.environments.archive(externalEnvironmentId);
        } catch (err) {
          this.normaliseError(err);
        }
      });
    }

    if (legacyExternalVaultId) {
      await this.withRetry(async () => {
        try {
          await (client as any).beta.vaults.archive(legacyExternalVaultId);
        } catch (err) {
          this.normaliseError(err);
        }
      });
    }
  }

  async getAllPendingToolApprovals(sessionId: string): Promise<PendingToolApproval[]> {
    const client = await this.getClient();

    try {
      const toolUseIds = await this.getRequiresActionToolUseIds(client, sessionId);

      if (toolUseIds.length === 0) {
        return [];
      }

      return this.resolvePendingToolApprovals(client, sessionId, toolUseIds);
    } catch (err) {
      this.normaliseError(err);
    }
  }

  /** Tool-use ids Anthropic is blocked on in the latest session pause. */
  private async getRequiresActionToolUseIds(client: AnthropicCompatibleClient, sessionId: string): Promise<string[]> {
    const iterator = (client as any).beta.sessions.events.list(sessionId, {
      order: 'desc',
      types: ['session.status_idle', 'session.thread_status_idle'],
    });

    for await (const event of iterator) {
      const stopReason = event?.stop_reason as { type?: string; event_ids?: string[] } | undefined;

      if (stopReason?.type === 'requires_action') {
        return (stopReason.event_ids ?? []).filter(
          (toolUseId): toolUseId is string => typeof toolUseId === 'string' && toolUseId.length > 0
        );
      }
    }

    return [];
  }

  private async resolvePendingToolApprovals(
    client: AnthropicCompatibleClient,
    sessionId: string,
    toolUseIds: string[]
  ): Promise<PendingToolApproval[]> {
    const pendingIds = new Set(toolUseIds);
    const tools = new Map<string, PendingToolApproval>();

    const iterator = (client as any).beta.sessions.events.list(sessionId, {
      order: 'asc',
      types: ['agent.mcp_tool_use', 'agent.tool_use'],
    });

    for await (const event of iterator) {
      const toolUseId = event?.id as string | undefined;

      if (!toolUseId || !pendingIds.has(toolUseId)) {
        continue;
      }

      tools.set(toolUseId, {
        toolUseId,
        toolName: (event.name as string | undefined) ?? 'unknown_tool',
        mcpServerName: event.type === 'agent.mcp_tool_use' ? (event.mcp_server_name as string) : undefined,
        input: (event.input as Record<string, unknown> | undefined) ?? undefined,
      });

      if (tools.size === pendingIds.size) {
        break;
      }
    }

    return toolUseIds
      .map((toolUseId) => tools.get(toolUseId))
      .filter((tool): tool is PendingToolApproval => tool !== undefined);
  }

  async createVault(input: CreateVaultInput): Promise<CreateVaultResult> {
    const client = await this.getClient();

    // Not retried: vault creation is not idempotent and a retry after a
    // dropped response would mint a second vault and permanently orphan the
    // first. Callers (`McpConnectionVaultService`) detect race-induced
    // orphans separately via a `setIfMissing` claim + warn-log.
    try {
      const vault = await (client as any).beta.vaults.create({
        display_name: input.displayName,
      });

      return { externalVaultId: vault.id as string };
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async upsertVaultCredential(input: UpsertVaultCredentialInput): Promise<UpsertVaultCredentialResult> {
    const client = await this.getClient();
    const vaultId = input.externalVaultId;
    const existingCredentialId = input.existingCredentialId;

    return this.withRetry(async () => {
      try {
        if (existingCredentialId) {
          const updated = await (client as any).beta.vaults.credentials.update(existingCredentialId, {
            vault_id: vaultId,
            display_name: input.displayName,
            auth: buildMcpOAuthUpdateAuth(input.auth),
          });

          return { vaultCredentialId: updated.id as string };
        }

        try {
          const created = await (client as any).beta.vaults.credentials.create(vaultId, {
            display_name: input.displayName,
            auth: buildMcpOAuthCreateAuth(input.mcpServerUrl, input.auth),
          });

          return { vaultCredentialId: created.id as string };
        } catch (createErr) {
          // Anthropic enforces uniqueness on (vault_id, auth.mcp_server_url).
          // If a previous flow pushed a credential for this URL but Novu's
          // `mcp_connection.auth.vaultCredentialId` was never persisted (or
          // got cleared — e.g. manual cleanup, a dropped DB write after a
          // successful vault push), the CREATE branch hits 409. Recover by
          // listing the vault and rebinding to the orphan via UPDATE so the
          // agent.mcp_servers projection can finally point at a usable credential.
          const recovered = await this.tryRecoverOrphanVaultCredential({
            client,
            vaultId,
            mcpServerUrl: input.mcpServerUrl,
            displayName: input.displayName,
            auth: input.auth,
            error: createErr,
          });

          if (recovered) {
            return { vaultCredentialId: recovered };
          }

          throw createErr;
        }
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  /**
   * Recover from a 409 "credential already exists" on CREATE by listing the
   * vault's credentials, finding the one whose `auth.mcp_server_url` matches,
   * and calling UPDATE with its id. Returns the recovered credential id on
   * success, or `null` if the error wasn't a 409 conflict or no matching
   * credential could be found.
   *
   * If the matching credential is archived we delete it first and re-CREATE,
   * because Anthropic's archive flow doesn't allow updating in place.
   */
  private async tryRecoverOrphanVaultCredential(args: {
    client: AnthropicCompatibleClient;
    vaultId: string;
    mcpServerUrl: string;
    displayName: string;
    auth: VaultCredentialAuth;
    error: unknown;
  }): Promise<string | null> {
    const { client, vaultId, mcpServerUrl, displayName, auth, error } = args;

    if (!(error instanceof APIError) || error.status !== 409) {
      return null;
    }

    let orphan: { id: string; mcpServerUrl: string; archived: boolean } | null = null;

    try {
      const credentials = (client as any).beta.vaults.credentials.list(vaultId, { include_archived: true });

      for await (const credential of credentials) {
        const credAuth = (credential as { auth?: { mcp_server_url?: string } }).auth;
        const credUrl = credAuth?.mcp_server_url;

        if (typeof credUrl === 'string' && credUrl === mcpServerUrl) {
          orphan = {
            id: (credential as { id: string }).id,
            mcpServerUrl: credUrl,
            archived: !!(credential as { archived_at?: string | null }).archived_at,
          };
          break;
        }
      }
    } catch {
      return null;
    }

    if (!orphan) {
      return null;
    }

    try {
      if (orphan.archived) {
        // Archived credentials still occupy the (vault, mcp_url) uniqueness
        // slot but can't be updated in place — delete then re-create.
        await (client as any).beta.vaults.credentials.delete(orphan.id, { vault_id: vaultId });
        const created = await (client as any).beta.vaults.credentials.create(vaultId, {
          display_name: displayName,
          auth: buildMcpOAuthCreateAuth(mcpServerUrl, auth),
        });

        return created.id as string;
      }

      const updated = await (client as any).beta.vaults.credentials.update(orphan.id, {
        vault_id: vaultId,
        display_name: displayName,
        auth: buildMcpOAuthUpdateAuth(auth),
      });

      return updated.id as string;
    } catch {
      return null;
    }
  }

  async deleteVaultCredential(input: DeleteVaultCredentialInput): Promise<void> {
    const client = await this.getClient();

    await this.withRetry(async () => {
      try {
        await (client as any).beta.vaults.credentials.delete(input.vaultCredentialId, {
          vault_id: input.externalVaultId,
        });
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async uploadSkill(input: UploadSkillInput): Promise<UploadSkillResult> {
    // Anthropic requires every file to live under a single common top-level
    // directory whose name matches the `name` declared in SKILL.md's YAML
    // frontmatter. Anything else (e.g. an owner-derived display title) is
    // rejected with a 400: `The folder name 'X' must match the skill name 'Y'`.
    const directoryName = extractSkillNameFromBundle(input.files);

    if (!directoryName) {
      throw new AgentRuntimeBadRequestError(
        'SKILL.md must declare a `name` in its YAML frontmatter — Anthropic requires the bundle folder name to match it.',
        this.providerId
      );
    }

    const client = await this.getClient();
    const displayTitle = input.displayTitle
      ? truncateWithEllipsis(input.displayTitle, MAX_DISPLAY_TITLE_LENGTH)
      : undefined;

    // Proactive lookup: when a `display_title` is supplied, check whether a
    // custom skill with the same title already exists in this environment and
    // route to version-append BEFORE attempting create. This gives every
    // upload source (`github-url`, `github-repo`, inline) the same re-upload
    // semantics: re-submitting an identical payload is always a version bump,
    // never a 400 — without depending on the catch-block fallback to fire.
    if (displayTitle) {
      const existingSkillId = await this.findExistingSkillIdByDisplayTitle(client, displayTitle);

      if (existingSkillId) {
        return this.appendSkillVersion(client, existingSkillId, input.files, directoryName);
      }
    }

    const files = await Promise.all(input.files.map((file) => toFile(file.content, `${directoryName}/${file.path}`)));

    // Not retried: skill creation is not idempotent and a retry after a
    // dropped response would create a duplicate billable skill upstream.
    try {
      const skill = await (client as any).beta.skills.create({
        ...(displayTitle ? { display_title: displayTitle } : {}),
        files,
      });

      return {
        skillId: skill.id as string,
        version: ((skill.latest_version as string | null | undefined) ?? null) as string | null,
      };
    } catch (err) {
      // Race fallback: a concurrent caller (or eventual-consistency on the
      // list endpoint) can hide an existing skill from our proactive lookup.
      // When create still comes back with a duplicate-title 400, retry the
      // lookup and route to the same version-append path.
      if (displayTitle && isDuplicateDisplayTitleError(err)) {
        const existingSkillId = await this.findExistingSkillIdByDisplayTitle(client, displayTitle);

        if (existingSkillId) {
          return this.appendSkillVersion(client, existingSkillId, input.files, directoryName);
        }
      }

      this.normaliseError(err);
    }
  }

  /**
   * Append a freshly-built bundle as a new version of an existing skill and
   * return the stable `skillId` alongside the new version label. Errors from
   * the underlying versions endpoint are surfaced via {@link normaliseError},
   * so the caller can rely on a thrown `AgentRuntime*Error` rather than a
   * stale `skillId` on partial failure.
   */
  private async appendSkillVersion(
    client: AnthropicCompatibleClient,
    skillId: string,
    files: UploadSkillFile[],
    directoryName: string
  ): Promise<UploadSkillResult> {
    // Not retried: version creation is not idempotent and a retry after a
    // dropped response would create a duplicate billable version.
    try {
      const version = await this.createSkillVersion(client, skillId, files, directoryName);

      return {
        skillId,
        version: ((version.version as string | null | undefined) ?? null) as string | null,
      };
    } catch (versionErr) {
      this.normaliseError(versionErr);
    }
  }

  /**
   * Walk the `beta.skills.list` cursor looking for a custom skill whose
   * `display_title` matches the supplied target. Returns the matching
   * `skillId` or `null` when no custom skill with that title exists.
   *
   * IMPORTANT: this intentionally does NOT pass `{ source: 'custom' }`.
   * Anthropic's server-side source filter is broken — with the filter the
   * API caps the response at the default 20-item page and returns
   * `has_more: false`, hiding custom skills that genuinely exist. Empirically:
   * filtered → 20 items, unfiltered → 61 items including the missing
   * `source: 'custom'` skill. We list unfiltered with a larger page size and
   * apply `source === 'custom'` client-side so we never accidentally try to
   * version-append an Anthropic built-in (`pdf`, `xlsx`, `pptx`, `docx`).
   */
  private async findExistingSkillIdByDisplayTitle(
    client: AnthropicCompatibleClient,
    displayTitle: string
  ): Promise<string | null> {
    try {
      const iterator = (client as any).beta.skills.list({ limit: 100 }) as AsyncIterable<{
        id: string;
        display_title: string | null;
        source?: string;
      }>;

      for await (const skill of iterator) {
        if (skill.display_title === displayTitle && skill.source === 'custom') {
          return skill.id;
        }
      }

      return null;
    } catch {
      // Lookup failures are best-effort: the caller will fall back to surfacing
      // the original duplicate-title error so the user sees the real cause.
      return null;
    }
  }

  /**
   * Append a new version to an existing skill by calling the underlying HTTP
   * endpoint directly. We can't use `client.beta.skills.versions.create` here
   * because @anthropic-ai/sdk@0.95.x defaults `stripFilenames` to `true` for
   * that endpoint, which strips directory components from the multipart form
   * `filename` parts. The Anthropic API then can't locate `SKILL.md` inside
   * a top-level folder and rejects the bundle.
   *
   *   skills.create        → multipartFormRequestOptions(..., false) → sends "my-skill/SKILL.md"
   *   skills.versions.create → multipartFormRequestOptions(...)      → sends "SKILL.md" (broken)
   *
   * Building the FormData ourselves and passing it to `client.post` bypasses
   * the SDK's stripping logic entirely (BaseAnthropic#buildBody hands any
   * FormData body straight through to fetch).
   */
  private async createSkillVersion(
    client: AnthropicCompatibleClient,
    skillId: string,
    files: UploadSkillFile[],
    directoryName: string
  ): Promise<{ version: string | null }> {
    const formData = new FormData();

    for (const file of files) {
      formData.append('files[]', new File([new Uint8Array(file.content)], `${directoryName}/${file.path}`));
    }

    return (await (client as any).post(`/v1/skills/${encodeURIComponent(skillId)}/versions?beta=true`, {
      body: formData,
      headers: { 'anthropic-beta': 'skills-2025-10-02' },
    })) as { version: string | null };
  }
}

export function createAnthropicProvider(
  providerId: AgentRuntimeProviderIdEnum,
  options: {
    apiKey?: string;
    awsCredentials?: ResolvedAwsAnthropicCredentials;
    credentials?: Record<string, unknown>;
  } = {}
): AnthropicAgentRuntimeProvider {
  const init: AnthropicProviderInit = { providerId };

  if (options.awsCredentials) {
    init.awsCredentials = options.awsCredentials;
  } else if (options.apiKey) {
    init.apiKey = options.apiKey;
  } else if (options.credentials) {
    if (isAnthropicAwsProvider(providerId)) {
      throw new Error('Use awsCredentials from resolveAgentRuntime() for anthropic-aws');
    }

    const legacyApiKey = typeof options.credentials.apiKey === 'string' ? options.credentials.apiKey.trim() : undefined;

    if (legacyApiKey) {
      init.apiKey = legacyApiKey;
    }
  }

  return new AnthropicAgentRuntimeProvider(init);
}
