import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import type { AgentRuntimeCapabilitiesDto, AgentRuntimeConfigResponseDto } from '../../dtos/agent-runtime-config.dto';
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

    if (!decryptedCredentials.apiKey) {
      throw new UnprocessableEntityException(
        `Integration for agent "${command.identifier}" has no API key configured. Please complete the integration setup.`
      );
    }

    const runtimeProvider = getAgentRuntimeProvider(providerId, decryptedCredentials.apiKey);

    const updated = await runtimeProvider.updateConfig(externalAgentId, {
      model: command.model,
      systemPrompt: command.systemPrompt,
      mcpServers: command.mcpServers,
      tools: command.tools,
      skills: command.skills,
    });

    const providerEntry = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId);

    const capabilities: AgentRuntimeCapabilitiesDto | undefined = providerEntry
      ? {
          mcpServers: providerEntry.capabilities.mcpServers,
          tools: providerEntry.capabilities.tools,
          model: providerEntry.capabilities.model,
          systemPrompt: providerEntry.capabilities.systemPrompt,
          skills: providerEntry.capabilities.skills,
        }
      : undefined;

    const result: AgentRuntimeConfigResponseDto = {
      model: updated.model,
      systemPrompt: updated.systemPrompt,
      mcpServers: updated.mcpServers,
      tools: updated.tools,
      ...(updated.skills !== undefined ? { skills: updated.skills } : {}),
      ...(capabilities !== undefined ? { capabilities } : {}),
    };

    return result;
  }
}
