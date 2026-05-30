import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  CalculateDemoClaudeQuota,
  CalculateDemoClaudeQuotaCommand,
  DemoQuotaExhaustedError,
} from '@novu/application-generic';
import { type AgentEntity, ConversationRepository, type ConversationTokenUsage } from '@novu/dal';
import type { Response as ThalamusResponse } from '@novu/thalamus';

import type { ManagedAgentContext } from './managed-agent.service';

@Injectable()
export class DemoClaudeQuotaPolicy {
  constructor(
    private readonly calculateDemoClaudeQuota: CalculateDemoClaudeQuota,
    private readonly conversationRepository: ConversationRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  async assertAllowed(context: ManagedAgentContext, agent: Pick<AgentEntity, '_id' | 'managedRuntime'>): Promise<void> {
    if (!agent.managedRuntime) {
      return;
    }

    const isDemo = await this.calculateDemoClaudeQuota.isAgentOnDemoIntegration(
      context.config.environmentId,
      context.config.organizationId,
      agent.managedRuntime._integrationId
    );

    if (!isDemo) {
      return;
    }

    const quota = await this.calculateDemoClaudeQuota.execute(
      CalculateDemoClaudeQuotaCommand.create({
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        conversationId: String(context.conversation._id),
      })
    );

    if (!quota?.isExhausted || !quota.reason) {
      return;
    }

    if (quota.reason === 'conversations') {
      this.analyticsService.track('[Novu Managed Claude] - Conversation limit reached', 'system', {
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        agentId: agent._id,
        ...quota.conversations,
      });
    }

    if (quota.reason === 'tokens') {
      this.analyticsService.track('[Novu Managed Claude] - Token limit reached', 'system', {
        environmentId: context.config.environmentId,
        organizationId: context.config.organizationId,
        agentId: agent._id,
        conversationId: String(context.conversation._id),
        ...quota.tokens,
      });
    }

    throw new DemoQuotaExhaustedError(quota.reason, quota.conversations, quota.tokens);
  }

  async recordUsage(
    environmentId: string,
    organizationId: string,
    conversationId: string,
    usage: ThalamusResponse['usage']
  ): Promise<void> {
    const delta = extractTokenUsageDelta(usage);

    if (!delta) {
      return;
    }

    await this.conversationRepository.incrementTokenUsage(environmentId, organizationId, conversationId, delta);
  }
}

type ThalamusUsageWithCache = NonNullable<ThalamusResponse['usage']> & {
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
};

function extractTokenUsageDelta(usage: ThalamusResponse['usage']): ConversationTokenUsage | undefined {
  if (!usage) {
    return undefined;
  }

  const usageWithCache = usage as ThalamusUsageWithCache;
  const inputTokens = usageWithCache.inputTokens ?? 0;
  const outputTokens = usageWithCache.outputTokens ?? 0;
  const cacheReadTokens = usageWithCache.cacheReadInputTokens ?? 0;
  const cacheCreationTokens = usageWithCache.cacheCreationInputTokens ?? 0;
  const totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens;

  if (totalTokens === 0) {
    return undefined;
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    totalTokens,
  };
}
