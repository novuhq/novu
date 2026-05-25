import { APIError } from '@anthropic-ai/sdk';
import type { AgentMcpServerDto, AgentSkillDto, AgentToolDto } from '@novu/shared';
import { CLAUDE_BUILTIN_TOOLS } from '@novu/shared';
import {
  AgentRuntimeNetworkError,
  AgentRuntimeOverloadedError,
  AgentRuntimeServiceUnavailableError,
  AgentRuntimeTimeoutError,
} from '../errors';
import type { UploadSkillFile, VaultCredentialAuth } from '../i-agent-runtime-provider';

export function parseRetryAfter(header: string | undefined | null): number {
  if (!header) return 60_000;
  const seconds = parseFloat(header);
  if (!Number.isNaN(seconds)) return Math.round(seconds * 1000);

  // RFC 9110 allows HTTP-date form
  const dateMs = Date.parse(header);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());

  return 60_000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Defensive truncation for upstream-bound string fields. If `value` is longer
 * than `max`, trims it and appends a single-character ellipsis `…` so the
 * caller can see the value was shortened. Returns `value` unchanged otherwise.
 */
export function truncateWithEllipsis(value: string, max: number): string {
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
export function extractSkillNameFromBundle(files: UploadSkillFile[]): string | null {
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
export function parseSkillNameLine(frontmatter: string): string | null {
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
export function trimTrailingSpacesAndTabs(value: string): string {
  let end = value.length;
  while (end > 0 && isSpaceOrTab(value[end - 1])) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

export function isSpaceOrTab(char: string): boolean {
  return char === ' ' || char === '\t';
}

export function isTransient(err: unknown): boolean {
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
export function isDuplicateDisplayTitleError(err: unknown): boolean {
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

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function mapSkill(raw: Record<string, unknown>): AgentSkillDto {
  return {
    type: raw.type as 'anthropic' | 'custom',
    skillId: raw.skill_id as string,
    version: (raw.version as string | null | undefined) ?? null,
  };
}

export function toSkillParam(skill: AgentSkillDto): Record<string, unknown> {
  return {
    type: skill.type,
    skill_id: skill.skillId,
    ...(skill.version != null ? { version: skill.version } : {}),
  };
}

export function mapMcpServer(raw: Record<string, unknown>): AgentMcpServerDto {
  return {
    externalId: (raw.name as string) ?? '',
    name: raw.name as string,
    url: raw.url as string,
  };
}

/**
 * The agent response `tools` array contains toolset objects, not plain tool entries.
 * Flatten builtin toolset configs into individual AgentToolDto entries.
 *
 * `mcp_toolset` entries are intentionally ignored here — MCP servers are modeled
 * separately via `agent.mcp_servers` (and Novu's enablement table), matching how
 * Claude surfaces built-in tools vs MCP integrations in its own UI.
 */
export function mapToolset(raw: Record<string, unknown>): AgentToolDto[] {
  if (raw.type === 'agent_toolset_20260401') {
    return ((raw.configs as any[]) ?? [])
      .filter((c) => c.enabled !== false)
      .map((c) => ({
        externalId: c.name as string,
        name: c.name as string,
        type: 'builtin' as const,
      }));
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
export function buildToolsPayload(
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
export function buildMcpOAuthCreateAuth(mcpServerUrl: string, auth: VaultCredentialAuth): Record<string, unknown> {
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

export function buildMcpOAuthUpdateAuth(auth: VaultCredentialAuth): Record<string, unknown> {
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

export function buildMcpOAuthRefreshParams(auth: VaultCredentialAuth): Record<string, unknown> {
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
export function buildMcpOAuthRefreshUpdateParams(auth: VaultCredentialAuth): Record<string, unknown> {
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
