import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { GetAgentCommand } from './get-agent.command';

@Injectable()
export class GetAgent {
  constructor(private readonly agentRepository: AgentRepository) {}

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

    return toAgentResponse(agent);
  }
}
