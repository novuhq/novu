import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';

import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import type { AgentIntegrationResponseDto } from '../../dtos';
import { AddAgentIntegrationCommand } from './add-agent-integration.command';

@Injectable()
export class AddAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: AddAgentIntegrationCommand): Promise<AgentIntegrationResponseDto> {
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

    const integration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier']
    );

    if (!integration) {
      throw new NotFoundException(
        `Integration with identifier "${command.integrationIdentifier}" was not found.`
      );
    }

    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (existingLink) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    const link = await this.agentIntegrationRepository.create({
      _agentId: agent._id,
      _integrationId: integration._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    return toAgentIntegrationResponse(link, integration.identifier);
  }
}
