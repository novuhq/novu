import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import type { AgentResponseDto, AgentRuntimeConfigResponseDto } from '../../../shared/dtos';
import { type ManagedRuntimeHydration, toAgentResponse } from '../../../shared/mappers/agent-response.mapper';
import { GetAgentRuntimeConfigCommand } from '../get-agent-runtime-config/get-agent-runtime-config.command';
import { GetAgentRuntimeConfig } from '../get-agent-runtime-config/get-agent-runtime-config.usecase';
import { GetAgentCommand } from './get-agent.command';

@Injectable()
export class GetAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly getAgentRuntimeConfigUsecase: GetAgentRuntimeConfig,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

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

    const [hydration, runtimeConfig] = await Promise.all([
      this.loadManagedRuntimeHydration(agent, command.environmentId, command.organizationId),
      this.loadRuntimeConfig(agent, command),
    ]);

    return toAgentResponse(agent, hydration, runtimeConfig);
  }

  private async loadRuntimeConfig(
    agent: { runtime?: string; identifier: string },
    command: GetAgentCommand
  ): Promise<AgentRuntimeConfigResponseDto | undefined> {
    if (agent.runtime !== 'managed') {
      return undefined;
    }

    try {
      const config = await this.getAgentRuntimeConfigUsecase.execute(
        GetAgentRuntimeConfigCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          identifier: agent.identifier,
        })
      );

      return config;
    } catch (err) {
      this.logger.warn(
        { err, agentIdentifier: agent.identifier },
        'Failed to load managed-runtime runtime config for GetAgent; returning agent without runtime config.'
      );

      return undefined;
    }
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
