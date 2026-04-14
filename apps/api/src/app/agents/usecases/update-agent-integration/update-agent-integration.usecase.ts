import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';

import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import type { AgentIntegrationResponseDto } from '../../dtos';
import { UpdateAgentIntegrationCommand } from './update-agent-integration.command';

@Injectable()
export class UpdateAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: UpdateAgentIntegrationCommand): Promise<AgentIntegrationResponseDto> {
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

    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _id: command.agentIntegrationId,
        _agentId: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!existingLink) {
      throw new NotFoundException(
        `Agent-integration link "${command.agentIntegrationId}" was not found for this agent.`
      );
    }

    const targetIntegration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier']
    );

    if (!targetIntegration) {
      throw new NotFoundException(
        `Integration with identifier "${command.integrationIdentifier}" was not found.`
      );
    }

    if (existingLink._integrationId === targetIntegration._id) {
      return toAgentIntegrationResponse(existingLink, targetIntegration.identifier);
    }

    const duplicate = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: targetIntegration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (duplicate && duplicate._id !== command.agentIntegrationId) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    await this.agentIntegrationRepository.updateOne(
      {
        _id: command.agentIntegrationId,
        _agentId: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: { _integrationId: targetIntegration._id } }
    );

    const updated = await this.agentIntegrationRepository.findById(
      {
        _id: command.agentIntegrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(
        `Agent-integration link "${command.agentIntegrationId}" was not found after update.`
      );
    }

    return toAgentIntegrationResponse(updated, targetIntegration.identifier);
  }
}
