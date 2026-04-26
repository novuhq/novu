import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import type { AgentResponseDto } from '../../dtos';
import { loadAgentIntegrationSummariesForAgents } from '../../helpers/load-agent-integration-summaries.helper';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { GetAgentCommand } from './get-agent.command';

@Injectable()
export class GetAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GetAgentCommand): Promise<AgentResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const integrationsByAgentId = await loadAgentIntegrationSummariesForAgents(
      this.agentIntegrationRepository,
      this.integrationRepository,
      command.environmentId,
      command.organizationId,
      [agent]
    );

    return {
      ...toAgentResponse(agent),
      integrations: integrationsByAgentId.get(agent._id) ?? [],
    };
  }
}
