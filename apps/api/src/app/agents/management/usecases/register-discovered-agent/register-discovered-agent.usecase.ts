import { Injectable } from '@nestjs/common';
import { AgentEntitlementsService, throwPlanLimitExceeded } from '@novu/application-generic';
import { AgentEntity, AgentRepository } from '@novu/dal';
import { RegisterDiscoveredAgentCommand } from './register-discovered-agent.command';

@Injectable()
export class RegisterDiscoveredAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentEntitlementsService: AgentEntitlementsService
  ) {}

  async execute(command: RegisterDiscoveredAgentCommand): Promise<AgentEntity> {
    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (existing) {
      return existing;
    }

    await this.assertCreationWithinLimit(command.organizationId, command.environmentId);

    return this.agentRepository.create({
      name: command.name,
      identifier: command.identifier,
      description: command.description,
      active: true,
      createdBy: command.userId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }

  private async assertCreationWithinLimit(organizationId: string, environmentId: string): Promise<void> {
    const allowance = await this.agentEntitlementsService.canCreateAgent(organizationId, environmentId);

    if (allowance.allowed) {
      return;
    }

    throwPlanLimitExceeded({
      resource: 'agents',
      limitSource: allowance.limitSource,
      limit: allowance.creationLimit,
      currentCount: allowance.totalCreated,
      planMessage:
        `You have reached the maximum number of agents that can be created on your plan (${allowance.creationLimit}). ` +
        'Upgrade your plan to create more agents.',
    });
  }
}
