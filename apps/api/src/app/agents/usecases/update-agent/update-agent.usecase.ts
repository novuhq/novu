import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository } from '@novu/dal';

import { toAgentResponse } from '../../mappers/agent-response.mapper';
import type { AgentResponseDto } from '../../dtos';
import { UpdateAgentCommand } from './update-agent.command';

@Injectable()
export class UpdateAgent {
  constructor(private readonly agentRepository: AgentRepository) {}

  async execute(command: UpdateAgentCommand): Promise<AgentResponseDto> {
    if (command.name === undefined && command.description === undefined) {
      throw new BadRequestException('At least one of name or description must be provided.');
    }

    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!existing) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const $set: Record<string, string> = {};

    if (command.name !== undefined) {
      $set.name = command.name;
    }

    if (command.description !== undefined) {
      $set.description = command.description;
    }

    await this.agentRepository.updateOne(
      {
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set }
    );

    const updated = await this.agentRepository.findById(
      {
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    return toAgentResponse(updated);
  }
}
