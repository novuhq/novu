import type { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';
import { MCP_SERVERS, McpConnectionStatusEnum } from '@novu/shared';

import type { OAuthMcp } from './oauth-mcp.types';

export type ListOAuthMcpsDeps = {
  subscriberRepository: SubscriberRepository;
  agentMcpServerRepository: AgentMcpServerRepository;
  mcpConnectionRepository: McpConnectionRepository;
};

/**
 * List every OAuth-capable MCP enabled on an agent and project each row's
 * connection status onto the `OAuthMcp` shape consumed by the setup-card UX.
 */
export async function listOAuthMcps(
  deps: ListOAuthMcpsDeps,
  params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }
): Promise<OAuthMcp[]> {
  const subscriber = await deps.subscriberRepository.findBySubscriberId(params.environmentId, params.subscriberId);

  if (!subscriber) {
    return [];
  }

  const enablements = await deps.agentMcpServerRepository.findOAuthEnablementsForAgent({
    organizationId: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
  });

  if (enablements.length === 0) {
    return [];
  }

  const connections = await deps.mcpConnectionRepository.findSubscriberConnectionsForAgent({
    organizationId: params.organizationId,
    environmentId: params.environmentId,
    subscriberId: subscriber._id,
    agentMcpServerIds: enablements.map((row) => row._id),
  });

  const connectionByEnablementId = new Map(connections.map((row) => [row._agentMcpServerId, row]));
  const rows: OAuthMcp[] = [];

  for (const enablement of enablements) {
    const connection = connectionByEnablementId.get(enablement._id);
    const catalog = MCP_SERVERS.find((entry) => entry.id === enablement.mcpId);
    const status = connection?.status as McpConnectionStatusEnum | undefined;
    const isError =
      status === McpConnectionStatusEnum.Error ||
      status === McpConnectionStatusEnum.Expired ||
      status === McpConnectionStatusEnum.Revoked;

    rows.push({
      mcpId: enablement.mcpId,
      name: catalog?.name ?? enablement.mcpId,
      agentMcpServerId: enablement._id,
      status,
      ...(isError ? { errorMessage: connection?.lastError?.message ?? 'Connection failed' } : {}),
    });
  }

  return rows;
}
