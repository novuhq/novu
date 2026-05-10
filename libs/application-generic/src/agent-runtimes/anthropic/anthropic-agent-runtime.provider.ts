import Anthropic, { APIConnectionError, APIConnectionTimeoutError, APIError } from '@anthropic-ai/sdk';
import type { AgentMcpServerDto, AgentRuntimeConfigDto, AgentToolDto } from '@novu/shared';
import { AGENT_RUNTIME_PROVIDERS, AgentRuntimeCapabilities, AgentRuntimeProviderIdEnum } from '@novu/shared';
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
  IAgentRuntimeProvider,
  UpdateAgentRuntimeConfigInput,
} from '../i-agent-runtime-provider';

const PROVIDER_ID = AgentRuntimeProviderIdEnum.Anthropic;
const DEFAULT_MODEL = 'claude-sonnet-4-5';
/** Single retry jitter window in ms */
const RETRY_JITTER_MS = 500;
/** Timeout for config calls in ms */
const REQUEST_TIMEOUT_MS = 10_000;

export class AnthropicAgentRuntimeProvider implements IAgentRuntimeProvider {
  readonly providerId = PROVIDER_ID;

  readonly capabilities: AgentRuntimeCapabilities = AGENT_RUNTIME_PROVIDERS.find(
    (p) => p.providerId === PROVIDER_ID
  )!.capabilities;

  private buildClient(apiKey: string): Anthropic {
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
      const requestId = err.headers?.['request-id'] as string | undefined;

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
        const retryAfterMs = parseRetryAfter(err.headers?.['retry-after'] as string | undefined);

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
    const client = this.buildClient((this as any)._apiKey);

    return this.withRetry(async () => {
      try {
        const agent = await (client as any).beta.agents.create({
          name: input.name,
          model: input.model ?? DEFAULT_MODEL,
          ...(input.systemPrompt ? { system_prompt: input.systemPrompt } : {}),
        });

        return { externalAgentId: agent.id as string };
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async deleteAgent(externalAgentId: string): Promise<void> {
    const client = this.buildClient((this as any)._apiKey);

    await this.withRetry(async () => {
      try {
        await (client as any).beta.agents.delete(externalAgentId);
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async getConfig(externalAgentId: string): Promise<AgentRuntimeConfigDto> {
    const client = this.buildClient((this as any)._apiKey);

    return this.withRetry(async () => {
      try {
        const [agent, mcpServersRaw, toolsRaw] = await Promise.all([
          (client as any).beta.agents.retrieve(externalAgentId),
          (client as any).beta.agents.mcpServers.list(externalAgentId).catch(() => ({ data: [] })),
          (client as any).beta.agents.tools.list(externalAgentId).catch(() => ({ data: [] })),
        ]);

        return {
          model: agent.model ?? DEFAULT_MODEL,
          systemPrompt: agent.system_prompt ?? '',
          mcpServers: ((mcpServersRaw as any).data ?? []).map(mapMcpServer),
          tools: ((toolsRaw as any).data ?? []).map(mapTool),
        };
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }

  async updateConfig(externalAgentId: string, patch: UpdateAgentRuntimeConfigInput): Promise<AgentRuntimeConfigDto> {
    const client = this.buildClient((this as any)._apiKey);

    return this.withRetry(async () => {
      try {
        const updatePayload: Record<string, unknown> = {};

        if (patch.model !== undefined) updatePayload.model = patch.model;
        if (patch.systemPrompt !== undefined) updatePayload.system_prompt = patch.systemPrompt;

        if (Object.keys(updatePayload).length > 0) {
          await (client as any).beta.agents.update(externalAgentId, updatePayload);
        }

        if (patch.mcpServers !== undefined) {
          await syncMcpServers(client, externalAgentId, patch.mcpServers);
        }

        if (patch.tools !== undefined) {
          await syncTools(client, externalAgentId, patch.tools);
        }

        return this.getConfig(externalAgentId);
      } catch (err) {
        this.normaliseError(err);
      }
    });
  }
}

/** Factory function — callers inject the apiKey at call time via a closure. */
export function createAnthropicProvider(apiKey: string): AnthropicAgentRuntimeProvider {
  const provider = new AnthropicAgentRuntimeProvider();
  (provider as any)._apiKey = apiKey;

  return provider;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parseRetryAfter(header: string | undefined): number {
  if (!header) return 60_000;
  const seconds = parseFloat(header);
  if (!Number.isNaN(seconds)) return Math.round(seconds * 1000);

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

function mapMcpServer(raw: Record<string, unknown>): AgentMcpServerDto {
  return {
    externalId: raw.id as string,
    name: raw.name as string,
    url: raw.url as string,
    authToken: raw.auth_token as string | undefined,
  };
}

function mapTool(raw: Record<string, unknown>): AgentToolDto {
  return {
    externalId: raw.id as string,
    name: raw.name as string,
    type: (raw.type === 'builtin' ? 'builtin' : 'custom') as 'builtin' | 'custom',
    description: raw.description as string | undefined,
  };
}

async function syncMcpServers(client: Anthropic, agentId: string, desired: AgentMcpServerDto[]): Promise<void> {
  const current: AgentMcpServerDto[] = (
    await (client as any).beta.agents.mcpServers.list(agentId).catch(() => ({ data: [] }))
  ).data.map(mapMcpServer);

  const currentIds = new Set(current.map((s) => s.externalId));
  const desiredIds = new Set(desired.map((s) => s.externalId).filter(Boolean));

  for (const server of current) {
    if (!desiredIds.has(server.externalId)) {
      await (client as any).beta.agents.mcpServers.delete(agentId, server.externalId);
    }
  }

  for (const server of desired) {
    if (!server.externalId || !currentIds.has(server.externalId)) {
      await (client as any).beta.agents.mcpServers.create(agentId, {
        name: server.name,
        url: server.url,
        ...(server.authToken ? { auth_token: server.authToken } : {}),
      });
    }
  }
}

async function syncTools(client: Anthropic, agentId: string, desired: AgentToolDto[]): Promise<void> {
  const current: AgentToolDto[] = (
    await (client as any).beta.agents.tools.list(agentId).catch(() => ({ data: [] }))
  ).data.map(mapTool);

  const currentIds = new Set(current.map((t) => t.externalId));
  const desiredIds = new Set(desired.map((t) => t.externalId).filter(Boolean));

  for (const tool of current) {
    if (!desiredIds.has(tool.externalId)) {
      await (client as any).beta.agents.tools.delete(agentId, tool.externalId);
    }
  }

  for (const tool of desired) {
    if (!tool.externalId || !currentIds.has(tool.externalId)) {
      await (client as any).beta.agents.tools.create(agentId, {
        name: tool.name,
        type: tool.type,
        ...(tool.description ? { description: tool.description } : {}),
      });
    }
  }
}
