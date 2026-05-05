import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, AgentRuntimeEnum, SubscriberAgentVaultRepository } from '@novu/dal';
import { isMcpCatalogId, MCP_CATALOG } from '../../runtimes/mcp-catalog';
import { ListSubscriberMcpConnectionsCommand } from './list-subscriber-mcp-connections.command';

export interface SubscriberMcpConnectionStatusDto {
  mcpServerName: string;
  displayName: string;
  status: 'not_connected' | 'connected' | 'expired' | 'failed';
  connectedAt?: string;
  lastUsedAt?: string;
}

export interface ListSubscriberMcpConnectionsResponse {
  data: SubscriberMcpConnectionStatusDto[];
}

/**
 * Returns one row per per-subscriber MCP server attached to the agent, decorated
 * with the connection state from this subscriber's Anthropic vault. Used by the
 * "My connections" page on the dashboard.
 */
@Injectable()
export class ListSubscriberMcpConnections {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberVaultRepository: SubscriberAgentVaultRepository
  ) {}

  async execute(command: ListSubscriberMcpConnectionsCommand): Promise<ListSubscriberMcpConnectionsResponse> {
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

    if ((agent.runtime ?? AgentRuntimeEnum.BRIDGE) !== AgentRuntimeEnum.CLAUDE_MANAGED) {
      return { data: [] };
    }

    const perSubscriberServers = (agent.managedRuntime?.mcpServers ?? []).filter(
      (server) => server.scope === 'per_subscriber' && isMcpCatalogId(server.name)
    );

    if (perSubscriberServers.length === 0) {
      return { data: [] };
    }

    const vault = await this.subscriberVaultRepository.findForSubscriberAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      agentId: agent._id,
    });

    const connections = vault?.connections ?? [];

    const data = perSubscriberServers.map((server) => {
      const connection = connections.find((c) => c.mcpServerName === server.name);
      const catalogEntry = MCP_CATALOG[server.name as keyof typeof MCP_CATALOG];

      return {
        mcpServerName: server.name,
        displayName: catalogEntry?.displayName ?? server.displayName,
        status: connection ? connection.status : ('not_connected' as const),
        connectedAt: connection?.connectedAt,
        lastUsedAt: connection?.lastUsedAt,
      } satisfies SubscriberMcpConnectionStatusDto;
    });

    return { data };
  }
}
