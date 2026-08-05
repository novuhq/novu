import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PinoLogger, resolveAgentRuntime } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import { AgentMcpDefinitionService } from '../../../mcp/runtime/agent-mcp-definition.service';
import type {
  AgentRuntimeCapabilitiesDto,
  AgentRuntimeConfigResponseDto,
} from '../../../shared/dtos/agent-runtime-config.dto';
import { UpdateAgentRuntimeConfigCommand } from './update-agent-runtime-config.command';

@Injectable()
export class UpdateAgentRuntimeConfig {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly agentMcpDefinitionService: AgentMcpDefinitionService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

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

    const resolved = resolveAgentRuntime(providerId, integration.credentials);

    if (!resolved) {
      throw new UnprocessableEntityException(
        `Integration for agent "${command.identifier}" has no API key configured. Please complete the integration setup.`
      );
    }

    const runtimeProvider = resolved.provider;
    const updated = await runtimeProvider.updateConfig(externalAgentId, {
      model: command.model,
      systemPrompt: command.systemPrompt,
      tools: command.tools,
      skills: command.skills,
    });

    // Same as get runtime config: shared agent MCPs only.
    const mcpRows = await this.agentMcpServerRepository.findByAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      enabledOnly: true,
    });

    const mcpServers = this.agentMcpDefinitionService.project(mcpRows, {
      agentId: agent._id,
      caller: UpdateAgentRuntimeConfig.name,
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
