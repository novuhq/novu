import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AnalyticsService, FeatureFlagsService } from '@novu/application-generic';
import { AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { trackAgentCreated } from '../../agent-analytics';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { CreateAgentCommand } from './create-agent.command';

@Injectable()
export class CreateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly featureFlagsService: FeatureFlagsService
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

    await this.assertRuntimeAllowed(command);

    const runtime = command.runtime ?? AgentRuntimeEnum.BRIDGE;
    const agent = await this.agentRepository.create({
      name: command.name,
      identifier: command.identifier,
      description: command.description,
      active: command.active ?? true,
      runtime,
      managedRuntime: runtime === AgentRuntimeEnum.CLAUDE_MANAGED ? command.managedRuntime : undefined,
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

  private async assertRuntimeAllowed(command: CreateAgentCommand): Promise<void> {
    const runtime = command.runtime ?? AgentRuntimeEnum.BRIDGE;
    if (runtime !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      return;
    }

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CLAUDE_MANAGED_AGENTS_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    if (!isEnabled) {
      throw new ForbiddenException('Claude Managed Agents are not enabled for this environment.');
    }

    if (!command.managedRuntime?.agentId || !command.managedRuntime.environmentId) {
      throw new BadRequestException('managedRuntime.agentId and managedRuntime.environmentId are required.');
    }
  }
}
