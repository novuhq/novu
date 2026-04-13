import { Injectable } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';

import { toAgentResponse } from '../../mappers/agent-response.mapper';
import type { AgentResponseDto } from '../../dtos';
import { ListAgentsCommand } from './list-agents.command';

@Injectable()
export class ListAgents {
  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(command: ListAgentsCommand): Promise<AgentResponseDto[]> {
    const agents = await this.agentRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*',
      { sort: { createdAt: -1 } }
    );

    return agents.map(toAgentResponse);
  }
}
