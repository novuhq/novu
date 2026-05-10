import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import type { AgentRuntimeConfigResponseDto } from '../../dtos/agent-runtime-config.dto';
import { GetAgentRuntimeConfigCommand } from './get-agent-runtime-config.command';

@Injectable()
export class GetAgentRuntimeConfig {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: GetAgentRuntimeConfigCommand): Promise<AgentRuntimeConfigResponseDto> {
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

    const config = await runtimeProvider.getConfig(externalAgentId);

    const providerEntry = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId);

    return {
      ...config,
      ...(providerEntry ? { capabilities: providerEntry.capabilities } : {}),
    } as AgentRuntimeConfigResponseDto;
  }
}
