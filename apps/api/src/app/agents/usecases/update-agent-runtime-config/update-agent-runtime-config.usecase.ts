import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import type { AgentRuntimeConfigResponseDto } from '../../dtos/agent-runtime-config.dto';
import { UpdateAgentRuntimeConfigCommand } from './update-agent-runtime-config.command';

@Injectable()
export class UpdateAgentRuntimeConfig {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: UpdateAgentRuntimeConfigCommand): Promise<AgentRuntimeConfigResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'runtime', 'managedRuntime']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.identifier}" not found.`);
    }

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      throw new UnprocessableEntityException('This agent does not use a managed runtime.');
    }

    const { providerId, _integrationId, externalAgentId } = agent.managedRuntime;

    const integration = await this.integrationRepository.findOne(
      {
        _id: _integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (!integration) {
      throw new NotFoundException(`Runtime integration not found for agent "${command.identifier}".`);
    }

    const decryptedCredentials = decryptCredentials(integration.credentials);
    const runtimeProvider = getAgentRuntimeProvider(providerId, decryptedCredentials.apiKey!);

    return runtimeProvider.updateConfig(externalAgentId, {
      model: command.model,
      systemPrompt: command.systemPrompt,
      mcpServers: command.mcpServers,
      tools: command.tools,
    }) as Promise<AgentRuntimeConfigResponseDto>;
  }
}
