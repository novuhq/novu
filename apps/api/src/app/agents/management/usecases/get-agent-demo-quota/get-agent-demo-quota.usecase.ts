import { Injectable, NotFoundException } from '@nestjs/common';
import { CalculateDemoClaudeQuota, CalculateDemoClaudeQuotaCommand } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { GetAgentDemoQuotaCommand } from './get-agent-demo-quota.command';

export interface AgentDemoQuotaResponseDto {
  conversations: { count: number; limit: number };
  tokens?: { count: number; limit: number };
  isExhausted: boolean;
  reason?: 'conversations' | 'tokens';
  isDemoAgent: boolean;
}

@Injectable()
export class GetAgentDemoQuota {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly calculateDemoClaudeQuota: CalculateDemoClaudeQuota
  ) {}

  async execute(command: GetAgentDemoQuotaCommand): Promise<AgentDemoQuotaResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      return {
        conversations: { count: 0, limit: 0 },
        isExhausted: false,
        isDemoAgent: false,
      };
    }

    const isDemo = await this.calculateDemoClaudeQuota.isAgentOnDemoIntegration(
      command.environmentId,
      command.organizationId,
      agent.managedRuntime._integrationId
    );

    if (!isDemo) {
      return {
        conversations: { count: 0, limit: 0 },
        isExhausted: false,
        isDemoAgent: false,
      };
    }

    const quota = await this.calculateDemoClaudeQuota.execute(
      CalculateDemoClaudeQuotaCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    if (!quota) {
      return {
        conversations: { count: 0, limit: 0 },
        isExhausted: false,
        isDemoAgent: true,
      };
    }

    return quota;
  }
}
