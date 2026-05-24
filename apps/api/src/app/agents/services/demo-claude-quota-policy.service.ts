import { Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  CalculateDemoClaudeQuota,
  CalculateDemoClaudeQuotaCommand,
  DemoQuotaExhaustedError,
} from '@novu/application-generic';
import { type AgentEntity, ConversationRepository } from '@novu/dal';
import type { Response as ThalamusResponse } from '@novu/thalamus';

import type { AgentExecutionParams } from './bridge-executor.service';

type TokenUsageDelta = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
};

type WebhookQuotaMetadata = {
  conversationId: string;
  environmentId: string;
  organizationId: string;
};

@Injectable()
export class DemoClaudeQuotaPolicy {
  constructor(
    private readonly calculateDemoClaudeQuota: CalculateDemoClaudeQuota,
    private readonly conversationRepository: ConversationRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  async assertAllowed(
    context: AgentExecutionParams,
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>
  ): Promise<void> {
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

  async recordUsage(metadata: WebhookQuotaMetadata, usage: ThalamusResponse['usage']): Promise<void> {
    const delta = extractTokenUsageDelta(usage);

    if (!delta) {
      return;
    }

    await this.conversationRepository.incrementTokenUsage(
      metadata.environmentId,
      metadata.organizationId,
      metadata.conversationId,
      delta
    );
  }
}

function extractTokenUsageDelta(usage: ThalamusResponse['usage']): TokenUsageDelta | undefined {
  if (!usage) {
    return undefined;
  }

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cacheReadTokens = usage.cacheReadInputTokens ?? 0;
  const cacheCreationTokens = usage.cacheCreationInputTokens ?? 0;
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
