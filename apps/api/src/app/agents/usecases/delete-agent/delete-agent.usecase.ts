import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';

import { DeleteAgentCommand } from './delete-agent.command';

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: DeleteAgentCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    await this.agentIntegrationRepository.delete({
      _agentId: agent._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    await this.agentRepository.delete({
      _id: agent._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
