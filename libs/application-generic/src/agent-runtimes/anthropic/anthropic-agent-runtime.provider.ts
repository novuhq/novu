import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError, toFile } from '@anthropic-ai/sdk';
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
  UploadSkillFile,
  UploadSkillInput,
  UploadSkillResult,
  UpsertVaultCredentialInput,
  UpsertVaultCredentialResult,
  VaultCredentialAuth,
} from '../i-agent-runtime-provider';

const PROVIDER_ID = AgentRuntimeProviderIdEnum.Anthropic;
const DEFAULT_MODEL = 'claude-sonnet-4-6';
/** Single retry jitter window in ms */
const RETRY_JITTER_MS = 500;
/** Timeout for config calls in ms */
const REQUEST_TIMEOUT_MS = 10_000;
/** Anthropic enforces a 64-char cap on `display_title` for `beta.skills.create`. */
const MAX_DISPLAY_TITLE_LENGTH = 64;

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

    const vaultIdRef = vaultId;

    return this.withRetry(async () => {
      try {
        if (existingCredentialId) {
          const updated = await (client as any).beta.vaults.credentials.update(existingCredentialId, {
            vault_id: vaultIdRef,
            display_name: input.displayName,
            auth: buildMcpOAuthUpdateAuth(input.auth),
          });

          return { vaultCredentialId: updated.id as string, integrationCredentialsUpdate };
        }

        try {
          const created = await (client as any).beta.vaults.credentials.create(vaultIdRef, {
            display_name: input.displayName,
            auth: buildMcpOAuthCreateAuth(input.mcpServerUrl, input.auth),
          });

          return { vaultCredentialId: created.id as string, integrationCredentialsUpdate };
        } catch (createErr) {
          // Anthropic enforces uniqueness on (vault_id, auth.mcp_server_url).
          // If a previous flow pushed a credential for this URL but Novu's
          // `mcp_connection.auth.vaultCredentialId` was never persisted (or
          // got cleared — e.g. legacy BullMQ-era runs, manual cleanup, a
          // dropped DB write after a successful vault push), the CREATE
          // branch hits 409. Recover by listing the vault and rebinding to
          // the orphan via UPDATE so the agent.mcp_servers projection can
          // finally point at a usable credential.
          const recovered = await this.tryRecoverOrphanVaultCredential({
            client,
            vaultId: vaultIdRef,
            mcpServerUrl: input.mcpServerUrl,
            displayName: input.displayName,
            auth: input.auth,
            error: createErr,
          });

          if (recovered) {
            return { vaultCredentialId: recovered, integrationCredentialsUpdate };
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
    client: Anthropic;
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

  async uploadSkill(input: UploadSkillInput): Promise<UploadSkillResult> {
    // Anthropic requires every file to live under a single common top-level
    // directory whose name matches the `name` declared in SKILL.md's YAML
    // frontmatter. Anything else (e.g. an owner-derived display title) is
    // rejected with a 400: `The folder name 'X' must match the skill name 'Y'`.
    const directoryName = extractSkillNameFromBundle(input.files);

    if (!directoryName) {
      throw new AgentRuntimeBadRequestError(
        'SKILL.md must declare a `name` in its YAML frontmatter — Anthropic requires the bundle folder name to match it.',
        PROVIDER_ID
      );
    }

    const client = this.buildClient();
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
    client: Anthropic,
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
  private async findExistingSkillIdByDisplayTitle(client: Anthropic, displayTitle: string): Promise<string | null> {
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
    client: Anthropic,
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

/**
 * Defensive truncation for upstream-bound string fields. If `value` is longer
 * than `max`, trims it and appends a single-character ellipsis `…` so the
 * caller can see the value was shortened. Returns `value` unchanged otherwise.
 */
function truncateWithEllipsis(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

/**
 * Reads the `name` field out of the YAML frontmatter of the `SKILL.md` at the
 * root of an uploaded skill bundle. Anthropic enforces that the bundle's
 * top-level folder name equals this value, so we use it verbatim as the
 * directory prefix when packaging files for `beta.skills.create`.
 *
 * Returns `null` when SKILL.md is missing, has no frontmatter, or has no
 * `name` field — callers should surface that as a bad-request condition.
 */
function extractSkillNameFromBundle(files: UploadSkillFile[]): string | null {
  const skillMd = files.find((f) => f.path === 'SKILL.md');

  if (!skillMd) {
    return null;
  }

  const content = skillMd.content.toString('utf8').replace(/^\uFEFF/, '');
  // Use `[ \t]*` (not `\s*`) so the pre-newline whitespace class does not overlap
  // with `\r?\n`. Overlapping whitespace classes can trigger polynomial
  // backtracking on adversarial input (flagged by CodeQL js/polynomial-redos).
  const frontmatter = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    return null;
  }

  return parseSkillNameLine(frontmatter[1]);
}

/**
 * Walks frontmatter line-by-line and extracts the `name:` value via plain
 * string operations. The previous single-regex (`/^[ \t]*name[ \t]*:[ \t]*(.*)$/m`)
 * placed two `[ \t]*` quantifiers around a lazy/greedy capture; even though
 * `name` is a fixed anchor between them, CodeQL flagged the shape as
 * `js/polynomial-redos`. Per-line string ops sidestep the static analyser
 * without changing observable semantics.
 *
 * Trailing-whitespace trimming uses a manual backward scan rather than
 * `/[ \t]+$/`: CodeQL also flags `+`-quantified character classes anchored
 * at `$` because a backtracking engine can degrade to O(n²) when the
 * surrounding text isn't a match. Leading trims keep their `/^[ \t]+/`
 * form — `^`-anchored quantifiers are tried at exactly one position and
 * are unambiguously linear.
 */
function parseSkillNameLine(frontmatter: string): string | null {
  for (const rawLine of frontmatter.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    const trimmedStart = line.replace(/^[ \t]+/, '');

    if (!trimmedStart.startsWith('name')) {
      continue;
    }

    const afterName = trimmedStart.slice(4).replace(/^[ \t]+/, '');

    if (!afterName.startsWith(':')) {
      continue;
    }

    let value = trimTrailingSpacesAndTabs(afterName.slice(1).replace(/^[ \t]+/, ''));

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).trim();
    }

    return value.length > 0 ? value : null;
  }

  return null;
}

/**
 * Linear-time trim of trailing ASCII space and tab characters. Used in
 * place of `String.prototype.replace(/[ \t]+$/, '')` to avoid CodeQL's
 * `js/polynomial-redos` warning on `+`-quantified, `$`-anchored character
 * classes.
 */
function trimTrailingSpacesAndTabs(value: string): string {
  let end = value.length;
  while (end > 0 && isSpaceOrTab(value[end - 1])) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

function isSpaceOrTab(char: string): boolean {
  return char === ' ' || char === '\t';
}

function isTransient(err: unknown): boolean {
  return (
    err instanceof AgentRuntimeServiceUnavailableError ||
    err instanceof AgentRuntimeTimeoutError ||
    err instanceof AgentRuntimeNetworkError ||
    err instanceof AgentRuntimeOverloadedError
  );
}

/**
 * True when Anthropic rejects `beta.skills.create` because another custom
 * skill in the same environment already uses the requested `display_title`.
 *
 * Detection is by substring because the SDK only surfaces the upstream message
 * as a string — there is no structured error code. Both the top-level
 * `err.message` (which embeds the JSON body) and the parsed `err.error`
 * payload are checked so we tolerate either shape.
 */
function isDuplicateDisplayTitleError(err: unknown): boolean {
  if (!(err instanceof APIError) || err.status !== 400) {
    return false;
  }

  const directMessage = err.message ?? '';
  const errorBody = (err as unknown as { error?: unknown }).error;
  const serializedBody = errorBody ? safeStringify(errorBody) : '';

  return (
    /reuse an existing display_title/i.test(directMessage) || /reuse an existing display_title/i.test(serializedBody)
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
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

  // Anthropic's UPDATE schema (BetaManagedAgentsMCPOAuthRefreshUpdateParams)
  // only permits `refresh_token`, `scope`, and `token_endpoint_auth` — the
  // other refresh fields (`client_id`, `token_endpoint`, `resource`) are
  // immutable after CREATE. Emitting them yields a 400:
  //   "auth.refresh.client_id: Extra inputs are not permitted"
  if (auth.refreshToken && auth.oauthClient) {
    payload.refresh = buildMcpOAuthRefreshUpdateParams(auth);
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

/**
 * Build the UPDATE-shaped refresh payload. Anthropic treats `client_id`,
 * `token_endpoint`, and `resource` as immutable on a credential, so the
 * update endpoint only accepts `refresh_token`, `scope`, and a partial
 * `token_endpoint_auth` (basic / post update params). Emitting any of the
 * immutable fields trips a 400 "Extra inputs are not permitted".
 */
function buildMcpOAuthRefreshUpdateParams(auth: VaultCredentialAuth): Record<string, unknown> {
  if (!auth.refreshToken || !auth.oauthClient) {
    throw new Error('buildMcpOAuthRefreshUpdateParams requires refreshToken and oauthClient');
  }

  const { oauthClient } = auth;
  const tokenEndpointAuth = oauthClient.clientSecret
    ? { type: 'client_secret_post', client_secret: oauthClient.clientSecret }
    : undefined;

  const payload: Record<string, unknown> = {
    refresh_token: auth.refreshToken,
    scope: auth.scopes && auth.scopes.length > 0 ? auth.scopes.join(' ') : null,
  };

  if (tokenEndpointAuth) {
    payload.token_endpoint_auth = tokenEndpointAuth;
  }

  return payload;
}
