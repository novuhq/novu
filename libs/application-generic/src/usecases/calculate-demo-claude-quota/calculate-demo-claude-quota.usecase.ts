import { Injectable } from '@nestjs/common';
import { AgentRepository, ConversationRepository, IntegrationRepository } from '@novu/dal';
import { AgentRuntimeProviderIdEnum, IntegrationKindEnum } from '@novu/shared';
import { endOfMonth, startOfMonth } from 'date-fns';

import { areNovuManagedClaudeCredentialsSet } from '../../utils/novu-integrations';
import { CalculateDemoClaudeQuotaCommand } from './calculate-demo-claude-quota.command';

export type DemoClaudeQuotaResult = {
  conversations: { count: number; limit: number };
  tokens?: { count: number; limit: number };
  isExhausted: boolean;
  reason?: 'conversations' | 'tokens';
  isDemoAgent: boolean;
};

@Injectable()
export class CalculateDemoClaudeQuota {
  static MAX_CONVERSATIONS = parseInt(process.env.MAX_NOVU_MANAGED_CLAUDE_CONVERSATIONS || '10', 10);

  static MAX_TOKENS_PER_CONVERSATION = parseInt(
    process.env.MAX_NOVU_MANAGED_CLAUDE_TOKENS_PER_CONVERSATION || '100000',
    10
  );

  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly conversationRepository: ConversationRepository
  ) {}

  async execute(command: CalculateDemoClaudeQuotaCommand): Promise<DemoClaudeQuotaResult | undefined> {
    if (!areNovuManagedClaudeCredentialsSet()) {
      return undefined;
    }

    const demoIntegrations = await this.integrationRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        kind: IntegrationKindEnum.AGENT,
        providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
      },
      '_id'
    );

    if (demoIntegrations.length === 0) {
      return undefined;
    }

    const demoIntegrationIds = new Set(demoIntegrations.map((integration) => String(integration._id)));
    const demoAgents = await this.agentRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        'managedRuntime._integrationId': { $in: Array.from(demoIntegrationIds) },
      },
      ['_id', 'managedRuntime']
    );

    if (demoAgents.length === 0) {
      return undefined;
    }

    const demoAgentIds = demoAgents.map((agent) => String(agent._id));
    const conversationLimit = CalculateDemoClaudeQuota.MAX_CONVERSATIONS;
    const tokenLimit = CalculateDemoClaudeQuota.MAX_TOKENS_PER_CONVERSATION;

    const conversationsCount = await this.conversationRepository.count(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _agentId: { $in: demoAgentIds },
        createdAt: {
          $gte: startOfMonth(new Date()),
          $lte: endOfMonth(new Date()),
        },
      },
      conversationLimit + 1
    );

    const conversations = { count: conversationsCount, limit: conversationLimit };
    let tokens: { count: number; limit: number } | undefined;
    let reason: 'conversations' | 'tokens' | undefined;

    if (conversationsCount >= conversationLimit) {
      reason = 'conversations';
    }

    if (command.conversationId) {
      const conversation = await this.conversationRepository.findOne(
        {
          _id: command.conversationId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        ['tokenUsage']
      );

      const tokenCount = conversation?.tokenUsage?.totalTokens ?? 0;
      tokens = { count: tokenCount, limit: tokenLimit };

      if (tokenCount >= tokenLimit) {
        reason = 'tokens';
      }
    }

    const isExhausted = reason !== undefined;

    return {
      conversations,
      tokens,
      isExhausted,
      reason,
      isDemoAgent: true,
    };
  }

  async isAgentOnDemoIntegration(
    environmentId: string,
    organizationId: string,
    integrationId: string
  ): Promise<boolean> {
    if (!areNovuManagedClaudeCredentialsSet()) {
      return false;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['providerId', 'kind']
    );

    return (
      integration?.kind === IntegrationKindEnum.AGENT &&
      integration.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic
    );
  }
}
