import { Injectable } from '@nestjs/common';
import { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionStatusEnum } from '@novu/shared';

import { ListPendingOAuthMcpsCommand } from './list-pending-oauth-mcps.command';

type PendingOAuthMcpStatus = McpConnectionStatusEnum | 'missing';

export type PendingOAuthMcp = {
  mcpId: string;
  name: string;
  agentMcpServerId: string;
  status: PendingOAuthMcpStatus;
};

@Injectable()
export class ListPendingOAuthMcps {
  constructor(
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: ListPendingOAuthMcpsCommand): Promise<PendingOAuthMcp[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      return [];
    }

    const enablements = await this.agentMcpServerRepository.findOAuthEnablementsForAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: command.agentId,
    });

    if (enablements.length === 0) {
      return [];
    }

    const connections = await this.mcpConnectionRepository.findSubscriberConnectionsForAgent({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      agentMcpServerIds: enablements.map((row) => row._id),
    });

    const connectionByEnablementId = new Map(connections.map((row) => [row._agentMcpServerId, row]));

    const pending: PendingOAuthMcp[] = [];

    for (const enablement of enablements) {
      const connection = connectionByEnablementId.get(enablement._id);

      if (connection?.status === McpConnectionStatusEnum.Connected) {
        continue;
      }

      const catalog = MCP_SERVERS.find((entry) => entry.id === enablement.mcpId);

      pending.push({
        mcpId: enablement.mcpId,
        name: catalog?.name ?? enablement.mcpId,
        agentMcpServerId: enablement._id,
        status: (connection?.status as PendingOAuthMcpStatus | undefined) ?? 'missing',
      });
    }

    return pending;
  }
}
