import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import type { AgentRuntimeCapabilitiesDto, AgentRuntimeConfigResponseDto } from '../../dtos/agent-runtime-config.dto';
import { projectMcpRowsToCatalog } from '../../utils/project-mcp-servers';
import { UpdateAgentRuntimeConfigCommand } from './update-agent-runtime-config.command';

@Injectable()
export class UpdateAgentRuntimeConfig {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: UpdateAgentRuntimeConfigCommand): Promise<AgentRuntimeConfigResponseDto> {
    if (command.mcpServers !== undefined) {
      // MCP enablement now goes through POST/DELETE /agents/:id/mcp-servers,
      // which writes Mongo first and projects to the provider. Updating the
      // MCP list via this legacy field would race with the new flow's
      // cascade-deletes of `mcp_connection` rows. Hard reject to make the
      // contract explicit.
      throw new BadRequestException(
        'Updating mcpServers via /runtime/config is no longer supported. ' +
          'Use POST /agents/:identifier/mcp-servers and DELETE /agents/:identifier/mcp-servers/:mcpId instead.'
      );
    }

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
      tools: command.tools,
      skills: command.skills,
    });

    const mcpRows = await this.agentMcpServerRepository.findByAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      enabledOnly: true,
    });

    const mcpServers = projectMcpRowsToCatalog(mcpRows, this.logger, {
      agentId: agent._id,
      useCase: UpdateAgentRuntimeConfig.name,
    });

    const providerEntry = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId);

    const capabilities: AgentRuntimeCapabilitiesDto | undefined = providerEntry
      ? {
          mcpServers: providerEntry.capabilities.mcpServers,
          tools: providerEntry.capabilities.tools,
          model: providerEntry.capabilities.model,
          systemPrompt: providerEntry.capabilities.systemPrompt,
          skills: providerEntry.capabilities.skills,
          tokenVault: providerEntry.capabilities.tokenVault ?? false,
        }
      : undefined;

    const result: AgentRuntimeConfigResponseDto = {
      model: updated.model,
      systemPrompt: updated.systemPrompt,
      mcpServers,
      tools: updated.tools,
      ...(updated.skills !== undefined ? { skills: updated.skills } : {}),
      ...(capabilities !== undefined ? { capabilities } : {}),
    };

    return result;
  }
}
