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

    const isManaged = command.runtime === 'managed' && command.managedRuntime;

    const agent = isManaged
      ? await this.agentRepository.withTransaction(async (session) => {
          const created = await this.agentRepository.create(
            {
              name: command.name,
              identifier: command.identifier,
              description: command.description,
              active: command.active ?? true,
              _environmentId: command.environmentId,
              _organizationId: command.organizationId,
            },
            { session }
          );

          try {
            await this.provisionManagedAgentUsecase.execute(
              Object.assign(new ProvisionManagedAgentCommand(), {
                agentId: created._id,
                name: command.name,
                providerId: command.managedRuntime!.providerId,
                integrationId: command.managedRuntime!.integrationId,
                model: command.managedRuntime!.model,
                systemPrompt: command.managedRuntime!.systemPrompt,
                tools: command.managedRuntime!.tools,
                mcpServers: command.managedRuntime!.mcpServers,
                skills: command.managedRuntime!.skills,
                environmentId: command.environmentId,
                organizationId: command.organizationId,
              }),
              { session }
            );
          } catch (provisionError) {
            // When running without a replica set (e.g. local dev), the transaction does not
            // auto-abort on throw, so we delete the agent we just inserted as a compensating action.
            if (!session) {
              await this.agentRepository.delete({
                _id: created._id,
                _environmentId: command.environmentId,
                _organizationId: command.organizationId,
              });
            }
            throw provisionError;
          }

          return created;
        })
      : await this.agentRepository.create({
          name: command.name,
          identifier: command.identifier,
          description: command.description,
          active: command.active ?? true,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        });

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
