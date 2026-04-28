import { ConflictException, Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { trackAgentCreated } from '../../agent-analytics';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { CreateAgentCommand } from './create-agent.command';

@Injectable()
export class CreateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly analyticsService: AnalyticsService
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

    trackAgentCreated(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      active: agent.active ?? true,
      name: agent.name,
    });

    return toAgentResponse(agent);
  }
}
