import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';

import { RemoveAgentIntegrationCommand } from './remove-agent-integration.command';

@Injectable()
export class RemoveAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: RemoveAgentIntegrationCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    const deleted = await this.agentIntegrationRepository.findOneAndDelete({
      _id: command.agentIntegrationId,
      _agentId: agent._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!deleted) {
      throw new NotFoundException(
        `Agent-integration link "${command.agentIntegrationId}" was not found for this agent.`
      );
    }
  }
}
