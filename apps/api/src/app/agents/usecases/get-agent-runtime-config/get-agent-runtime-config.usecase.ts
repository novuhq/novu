import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, getAgentRuntimeProvider, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import type { AgentRuntimeCapabilitiesDto, AgentRuntimeConfigResponseDto } from '../../dtos/agent-runtime-config.dto';
import { projectMcpRowsToCatalog } from '../../utils/project-mcp-servers';
import { GetAgentRuntimeConfigCommand } from './get-agent-runtime-config.command';

@Injectable()
export class GetAgentRuntimeConfig {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

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

    // Mongo is authoritative for the agent's MCP list. Other runtime fields
    // (model, system prompt, tools, skills) still come live from the provider.
    const [config, mcpRows] = await Promise.all([
      runtimeProvider.getConfig(externalAgentId),
      this.agentMcpServerRepository.findByAgent({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentId: agent._id,
        enabledOnly: true,
      }),
    ]);

    const mcpServers = projectMcpRowsToCatalog(mcpRows, this.logger, {
      agentId: agent._id,
      useCase: GetAgentRuntimeConfig.name,
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
      model: config.model,
      systemPrompt: config.systemPrompt,
      mcpServers,
      tools: config.tools,
      ...(config.skills !== undefined ? { skills: config.skills } : {}),
      ...(capabilities !== undefined ? { capabilities } : {}),
    };

    return result;
  }
}
