import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError, toFile } from '@anthropic-ai/sdk';
import type { AgentMcpServerDto, AgentRuntimeConfigDto, AgentSkillDto, AgentToolDto } from '@novu/shared';
import {
  AGENT_RUNTIME_PROVIDERS,
  AgentRuntimeCapabilities,
  AgentRuntimeProviderIdEnum,
  CLAUDE_BUILTIN_TOOLS,
} from '@novu/shared';
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
  GetAgentResult,
  IAgentRuntimeProvider,
  ProvisionIntegrationInput,
  ProvisionIntegrationResult,
  UpdateAgentRuntimeConfigInput,
  UploadSkillFile,
  UploadSkillInput,
  UploadSkillResult,
} from '../i-agent-runtime-provider';

const PROVIDER_ID = AgentRuntimeProviderIdEnum.Anthropic;
const DEFAULT_MODEL = 'claude-sonnet-4-5';
/** Single retry jitter window in ms */
const RETRY_JITTER_MS = 500;
/** Timeout for config calls in ms */
const REQUEST_TIMEOUT_MS = 10_000;
/** Anthropic enforces a 64-char cap on `display_title` for `beta.skills.create`. */
const MAX_DISPLAY_TITLE_LENGTH = 64;

export class AnthropicAgentRuntimeProvider implements IAgentRuntimeProvider {
  readonly providerId = PROVIDER_ID;

  readonly capabilities: AgentRuntimeCapabilities = AGENT_RUNTIME_PROVIDERS.find(
    (p) => p.providerId === PROVIDER_ID
  ).capabilities;

  constructor(private readonly _apiKey: string) {}

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
        const agent = await (client as any).beta.agents.retrieve(externalAgentId);

        return { externalAgentId: agent.id as string, name: agent.name as string };
      } catch (err) {
        this.normaliseError(err);
      }
    });
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
        const updatePayload: Record<string, unknown> = {};

        if (patch.model !== undefined) updatePayload.model = patch.model;
        if (patch.systemPrompt !== undefined) updatePayload.system = patch.systemPrompt;
        if (patch.mcpServers !== undefined) {
          updatePayload.mcp_servers = patch.mcpServers.map((s) => ({ name: s.name, type: 'url', url: s.url }));
        }
        // For tools/mcpServers, fetch current state and merge so a one-sided
        // PATCH doesn't wipe out the side the caller didn't touch.
        if (patch.tools !== undefined || patch.mcpServers !== undefined) {
          const current = await this.getConfig(externalAgentId);
          const toolTypes =
            patch.tools !== undefined ? patch.tools.map((t) => t.name) : current.tools.map((t) => t.name);
          const mcpServers =
            patch.mcpServers !== undefined
              ? patch.mcpServers.map((s) => ({ name: s.name, url: s.url }))
              : current.mcpServers.map((s) => ({ name: s.name, url: s.url }));
          const toolsPayload = buildToolsPayload(toolTypes, mcpServers);

          if (toolsPayload.length > 0) updatePayload.tools = toolsPayload;
        }
        if (patch.skills !== undefined) {
          updatePayload.skills = patch.skills.map(toSkillParam);
        }

        await (client as any).beta.agents.update(externalAgentId, updatePayload);

        return this.getConfig(externalAgentId);
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async provisionIntegration(input: ProvisionIntegrationInput): Promise<ProvisionIntegrationResult> {
    const client = this.buildClient();

    // Not retried: environment creation is not idempotent.
    try {
      const env = await (client as any).beta.environments.create({
        name: `nv-${input.integrationName}`,
        config: {
          type: 'cloud',
          networking: { type: 'unrestricted' },
        },
      });

      return {
        credentialsUpdate: { externalEnvironmentId: env.id as string },
        metadata: {},
      };
    } catch (err) {
      this.normaliseError(err);
    }
  }

  async deprovisionIntegration(credentialsUpdate: Record<string, unknown>): Promise<void> {
    const externalEnvironmentId = credentialsUpdate.externalEnvironmentId as string | undefined;

    if (!externalEnvironmentId) {
      return;
    }

    const client = this.buildClient();

    await this.withRetry(async () => {
      try {
        await (client as any).beta.environments.archive(externalEnvironmentId);
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
    const files = await Promise.all(
      input.files.map((file) => toFile(file.content, `${directoryName}/${file.path}`))
    );
    const displayTitle = input.displayTitle
      ? truncateWithEllipsis(input.displayTitle, MAX_DISPLAY_TITLE_LENGTH)
      : undefined;

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
      // Anthropic rejects `beta.skills.create` with a 400 when a custom skill
      // already exists with the same `display_title` in this environment.
      // Treat the re-upload as an update: find the existing skill and push the
      // freshly-built bundle as a new version, returning the stable skillId.
      if (displayTitle && isDuplicateDisplayTitleError(err)) {
        const existingSkillId = await this.findExistingSkillIdByDisplayTitle(client, displayTitle);

        if (existingSkillId) {
          // Not retried: version creation is not idempotent and a retry after
          // a dropped response would create a duplicate billable version.
          try {
            const version = await this.createSkillVersion(client, existingSkillId, input.files, directoryName);

            return {
              skillId: existingSkillId,
              version: ((version.version as string | null | undefined) ?? null) as string | null,
            };
          } catch (versionErr) {
            this.normaliseError(versionErr);
          }
        }
      }

      this.normaliseError(err);
    }
  }

  /**
   * Iterate the auto-paginating `beta.skills.list` cursor until a custom skill
   * with a matching `display_title` is found. Returns `null` if no match is
   * found across all pages — callers should treat that as "no recovery
   * possible" and surface the original duplicate-title error.
   */
  private async findExistingSkillIdByDisplayTitle(client: Anthropic, displayTitle: string): Promise<string | null> {
    try {
      const iterator = (client as any).beta.skills.list({ source: 'custom' }) as AsyncIterable<{
        id: string;
        display_title: string | null;
      }>;

      for await (const skill of iterator) {
        if (skill.display_title === displayTitle) {
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
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatter) {
    return null;
  }

  const nameMatch = frontmatter[1].match(/^[ \t]*name[ \t]*:[ \t]*(.+?)[ \t]*$/m);

  if (!nameMatch) {
    return null;
  }

  let value = nameMatch[1].trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value.length > 0 ? value : null;
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

  return /reuse an existing display_title/i.test(directMessage) || /reuse an existing display_title/i.test(serializedBody);
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
