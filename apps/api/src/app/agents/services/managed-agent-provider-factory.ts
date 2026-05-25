import { Injectable } from '@nestjs/common';
import { type IAgentRuntimeProvider, PinoLogger, resolveAgentRuntime } from '@novu/application-generic';
import { type AgentEntity, AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { cloudflare, thalamus, type WebhookProvider } from '@novu/thalamus';
import { LRUCache } from 'lru-cache';

export interface ResolvedRuntime {
  provider: WebhookProvider;
  runtimeProvider: IAgentRuntimeProvider;
}

const MAX_CACHED_PROVIDERS = 200;
const PROVIDER_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class ManagedAgentProviderFactory {
  private readonly providers: LRUCache<string, ResolvedRuntime>;

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
    this.providers = new LRUCache<string, ResolvedRuntime>({
      max: MAX_CACHED_PROVIDERS,
      ttl: PROVIDER_TTL_MS,
    });
  }

  async getOrCreate(
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>,
    environmentId: string
  ): Promise<ResolvedRuntime> {
    if (!agent.managedRuntime) {
      throw new Error(`Agent ${agent._id} is not a managed agent`);
    }

    const key = `${agent.managedRuntime._integrationId}:${agent.managedRuntime.externalAgentId}`;
    const cached = this.providers.get(key);

    if (cached) {
      return cached;
    }

    const integration = await this.integrationRepository.findOne({
      _id: agent.managedRuntime._integrationId,
      _environmentId: environmentId,
    });
    if (!integration?.credentials) {
      throw new Error(`Integration ${agent.managedRuntime._integrationId} not found or has no credentials`);
    }

    const resolved = resolveAgentRuntime(integration.providerId, integration.credentials);

    if (!resolved) {
      throw new Error('Integration has no API key configured');
    }

    const { apiKey, credentials: creds, provider: runtimeProvider } = resolved;

    if (!creds.externalEnvironmentId) {
      throw new Error('Integration has no external environment id');
    }

    const provider = this.createProvider(integration.providerId as AgentRuntimeProviderIdEnum, {
      apiKey,
      agentId: agent.managedRuntime.externalAgentId,
      environmentId: creds.externalEnvironmentId as string,
    });
    const runtime: ResolvedRuntime = { provider, runtimeProvider };
    this.providers.set(key, runtime);

    return runtime;
  }

  /**
   * Best-effort resolution of the cached runtime provider for a webhook event.
   * Returns `null` when the agent can't be recovered (deleted, missing managedRuntime, etc.)
   * — callers fall back to the generic plain-text error reply.
   */
  async tryGetByAgentIdentifier(agentIdentifier: string, environmentId: string): Promise<IAgentRuntimeProvider | null> {
    try {
      const agent = await this.agentRepository.findOne({ identifier: agentIdentifier, _environmentId: environmentId }, [
        '_id',
        'managedRuntime',
      ]);

      if (!agent?.managedRuntime) {
        return null;
      }

      const { runtimeProvider } = await this.getOrCreate(agent, environmentId);

      return runtimeProvider;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), agentIdentifier },
        'Failed to resolve runtime provider for webhook event'
      );

      return null;
    }
  }

  private createProvider(
    providerId: AgentRuntimeProviderIdEnum,
    config: { apiKey: string; agentId: string; environmentId: string }
  ): WebhookProvider {
    const cfUrl = process.env.THALAMUS_CF_URL;
    if (!cfUrl) {
      throw new Error('THALAMUS_CF_URL is required for managed agents');
    }

    const webhookSecret = process.env.THALAMUS_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('THALAMUS_WEBHOOK_SECRET is required for managed agents');
    }

    const webhookBaseUrl = process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL;
    if (!webhookBaseUrl) {
      throw new Error('AGENT_API_HOSTNAME or API_ROOT_URL is required for managed agents');
    }

    switch (providerId) {
      case AgentRuntimeProviderIdEnum.Anthropic:
      case AgentRuntimeProviderIdEnum.NovuAnthropic:
        return thalamus.anthropic({
          ...config,
          durable: cloudflare({
            url: cfUrl,
            apiKey: process.env.THALAMUS_CF_API_KEY,
            webhook: {
              url: `${webhookBaseUrl}/v1/agents/events`,
              secret: webhookSecret,
            },
          }),
        });
      default:
        throw new Error(`Unsupported agent runtime provider: ${providerId}`);
    }
  }
}
