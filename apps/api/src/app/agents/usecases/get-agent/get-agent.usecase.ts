import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import type { AgentResponseDto } from '../../dtos';
import { type ManagedRuntimeHydration, toAgentResponse } from '../../mappers/agent-response.mapper';
import { GetAgentCommand } from './get-agent.command';

@Injectable()
export class GetAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GetAgentCommand): Promise<AgentResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const hydration = await this.loadManagedRuntimeHydration(agent, command.environmentId, command.organizationId);

    return toAgentResponse(agent, hydration);
  }

  private async loadManagedRuntimeHydration(
    agent: { runtime?: string; managedRuntime?: { _integrationId: string } },
    environmentId: string,
    organizationId: string
  ): Promise<ManagedRuntimeHydration | undefined> {
    if (agent.runtime !== 'managed' || !agent.managedRuntime?._integrationId) {
      return undefined;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: agent.managedRuntime._integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      return undefined;
    }

    const decrypted = decryptCredentials(integration.credentials ?? {});

    return {
      externalEnvironmentId: decrypted.externalEnvironmentId ?? undefined,
      externalWorkspaceId: decrypted.externalWorkspaceId ?? undefined,
    };
  }
}
