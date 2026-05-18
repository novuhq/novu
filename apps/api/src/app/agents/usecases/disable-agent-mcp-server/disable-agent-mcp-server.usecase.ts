import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, McpConnectionRepository } from '@novu/dal';

import { trackAgentMcpServerDisabled } from '../../agent-analytics';
import { SyncAgentMcpServersCommand } from '../sync-agent-mcp-servers/sync-agent-mcp-servers.command';
import { SyncAgentMcpServers } from '../sync-agent-mcp-servers/sync-agent-mcp-servers.usecase';
import { DisableAgentMcpServerCommand } from './disable-agent-mcp-server.command';

/**
 * Disable a catalog MCP on an agent.
 *
 *   1. Cascade-delete every `mcp_connection` row scoped to the
 *      `agent_mcp_server` we are about to remove.
 *   2. Delete the `agent_mcp_server` row.
 *   3. Project the new (smaller) enabled set onto the runtime provider via
 *      `SyncAgentMcpServers`.
 */
@Injectable()
export class DisableAgentMcpServer {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly syncAgentMcpServers: SyncAgentMcpServers,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(DisableAgentMcpServer.name);
  }

  async execute(command: DisableAgentMcpServerCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const enablement = await this.agentMcpServerRepository.findByAgentAndMcpId({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      mcpId: command.mcpId,
    });

    if (!enablement) {
      return;
    }

    await this.mcpConnectionRepository.delete({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _agentMcpServerId: enablement._id,
    });

    await this.agentMcpServerRepository.delete({
      _id: enablement._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    await this.syncAgentMcpServers.execute(
      SyncAgentMcpServersCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
      })
    );

    trackAgentMcpServerDisabled(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.agentIdentifier,
      mcpId: command.mcpId,
    });
  }
}
