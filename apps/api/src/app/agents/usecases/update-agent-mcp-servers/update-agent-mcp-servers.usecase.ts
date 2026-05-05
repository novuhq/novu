import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type AgentMcpServer, AgentRepository, AgentRuntimeEnum } from '@novu/dal';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { catalogEntryToAgentMcpServer, isMcpCatalogId, type McpCatalogId } from '../../runtimes/mcp-catalog';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { AnthropicProvisioningService } from '../../services/anthropic-provisioning.service';
import { UpdateAgentMcpServersCommand } from './update-agent-mcp-servers.command';

/**
 * Replaces the MCP server list on a Claude-managed agent and bumps the corresponding
 * Anthropic agent version. Anthropic uses array-replacement semantics for `mcp_servers`
 * and `tools`, so the caller must always send the full desired set.
 */
@Injectable()
export class UpdateAgentMcpServers {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly provisioningService: AnthropicProvisioningService
  ) {}

  async execute(command: UpdateAgentMcpServersCommand): Promise<AgentResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    if ((agent.runtime ?? AgentRuntimeEnum.BRIDGE) !== AgentRuntimeEnum.CLAUDE_MANAGED || !agent.managedRuntime) {
      throw new BadRequestException('Agent is not configured for Claude Managed Agents.');
    }

    const mcpServers = this.hydrate(command.mcpServers?.map((entry) => entry.id));

    const apiKey = await this.credentialsService.getApiKey(command.organizationId, command.environmentId);

    await this.provisioningService.updateAgent({
      apiKey,
      agentId: agent.managedRuntime.agentId,
      mcpServers: mcpServers ?? [],
    });

    await this.agentRepository.updateOne(
      {
        _id: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      mcpServers?.length
        ? { $set: { 'managedRuntime.mcpServers': mcpServers } }
        : { $unset: { 'managedRuntime.mcpServers': 1 } }
    );

    const updated = await this.agentRepository.findById(
      {
        _id: agent._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    return toAgentResponse(updated);
  }

  private hydrate(ids?: string[]): AgentMcpServer[] | undefined {
    if (!ids?.length) {
      return undefined;
    }

    const seen = new Set<McpCatalogId>();
    const hydrated: AgentMcpServer[] = [];

    for (const id of ids) {
      if (!isMcpCatalogId(id)) {
        throw new BadRequestException(`Unknown MCP catalog id "${id}".`);
      }

      if (seen.has(id)) {
        continue;
      }

      seen.add(id);
      hydrated.push(catalogEntryToAgentMcpServer(id));
    }

    return hydrated;
  }
}
