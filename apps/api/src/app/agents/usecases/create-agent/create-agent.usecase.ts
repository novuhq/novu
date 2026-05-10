import { ConflictException, Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { trackAgentCreated } from '../../agent-analytics';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { ProvisionManagedAgentCommand } from '../provision-managed-agent/provision-managed-agent.command';
import { ProvisionManagedAgent } from '../provision-managed-agent/provision-managed-agent.usecase';
import { CreateAgentCommand } from './create-agent.command';

@Injectable()
export class CreateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly provisionManagedAgentUsecase: ProvisionManagedAgent
  ) {}

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
      throw new ConflictException(
        `An agent with identifier "${command.identifier}" already exists in this environment.`
      );
    }

    const agent = await this.agentRepository.create({
      name: command.name,
      identifier: command.identifier,
      description: command.description,
      active: command.active ?? true,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (command.runtime === 'managed' && command.managedRuntime) {
      await this.provisionManagedAgentUsecase.execute(
        Object.assign(new ProvisionManagedAgentCommand(), {
          agentId: agent._id,
          name: command.name,
          providerId: command.managedRuntime.providerId,
          integrationId: command.managedRuntime.integrationId,
          model: command.managedRuntime.model,
          systemPrompt: command.managedRuntime.systemPrompt,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );
    }

    const updatedAgent = await this.agentRepository.findOne(
      {
        _id: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    trackAgentCreated(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      active: agent.active ?? true,
      name: agent.name,
    });

    return toAgentResponse(updatedAgent ?? agent);
  }
}
