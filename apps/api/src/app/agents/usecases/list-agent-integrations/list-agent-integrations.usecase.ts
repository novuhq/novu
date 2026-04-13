import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository } from '@novu/dal';

import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import type { AgentIntegrationResponseDto } from '../../dtos';
import { ListAgentIntegrationsCommand } from './list-agent-integrations.command';

@Injectable()
export class ListAgentIntegrations {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: ListAgentIntegrationsCommand): Promise<AgentIntegrationResponseDto[]> {
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

    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*',
      { sort: { createdAt: -1 } }
    );

    return links.map(toAgentIntegrationResponse);
  }
}
