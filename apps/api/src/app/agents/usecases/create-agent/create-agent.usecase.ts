import { ConflictException, Injectable } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';

import { toAgentResponse } from '../../mappers/agent-response.mapper';
import type { AgentResponseDto } from '../../dtos';
import { CreateAgentCommand } from './create-agent.command';

@Injectable()
export class CreateAgent {
  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(command: CreateAgentCommand): Promise<AgentResponseDto> {
    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (existing) {
      throw new ConflictException(`An agent with identifier "${command.identifier}" already exists in this environment.`);
    }

    const agent = await this.agentRepository.create({
      name: command.name,
      identifier: command.identifier,
      description: command.description,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    return toAgentResponse(agent);
  }
}
