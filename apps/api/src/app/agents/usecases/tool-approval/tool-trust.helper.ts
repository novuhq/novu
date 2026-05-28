import {
  type AgentMcpServerEntity,
  DEFAULT_MCP_TOOL_TRUST_POLICY,
  type McpConnectionEntity,
  type McpToolTrust,
  type McpToolTrustPolicy,
} from '@novu/dal';
import { MCP_SERVERS } from '@novu/shared';

export type ToolTrustPersistScope = 'tool' | 'server';

export function resolveToolTrustPolicy(trust: McpToolTrust | undefined, toolName: string): McpToolTrustPolicy {
  const toolPolicy = trust?.tools?.[toolName];

  if (toolPolicy) {
    return toolPolicy;
  }

  return trust?.serverDefault ?? DEFAULT_MCP_TOOL_TRUST_POLICY;
}

export function isToolTrusted(trust: McpToolTrust | undefined, toolName: string): boolean {
  return resolveToolTrustPolicy(trust, toolName) === 'always_allow';
}

export function mergeToolTrustPatch(params: {
  scope: ToolTrustPersistScope;
  toolName?: string;
}): Partial<McpToolTrust> {
  if (params.scope === 'server') {
    return { serverDefault: 'always_allow' };
  }

  if (!params.toolName) {
    throw new Error('toolName required for tool scope');
  }

  return { tools: { [params.toolName]: 'always_allow' } };
}

function matchesMcpServerName(enablement: AgentMcpServerEntity, mcpServerName: string): boolean {
  if (enablement.externalProjection?.mcpServerName === mcpServerName) {
    return true;
  }

  const catalog = MCP_SERVERS.find((entry) => entry.id === enablement.mcpId);

  return catalog?.name === mcpServerName;
}

export async function resolveTrustForPendingTool(deps: {
  findOAuthEnablementsForAgent: (params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
  }) => Promise<AgentMcpServerEntity[]>;
  findSubscriberConnection: (params: {
    organizationId: string;
    environmentId: string;
    agentMcpServerId: string;
    subscriberId: string;
  }) => Promise<McpConnectionEntity | null>;
  params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberMongoId?: string;
    mcpServerName?: string;
    toolName: string;
  };
}): Promise<{ connection: McpConnectionEntity; trusted: boolean } | null> {
  const { params } = deps;

  if (!params.subscriberMongoId || !params.mcpServerName) {
    return null;
  }

  const enablements = await deps.findOAuthEnablementsForAgent({
    organizationId: params.organizationId,
    environmentId: params.environmentId,
    agentId: params.agentId,
  });
  const enablement = enablements.find((row) => matchesMcpServerName(row, params.mcpServerName!));

  if (!enablement) {
    return null;
  }

  const connection = await deps.findSubscriberConnection({
    organizationId: params.organizationId,
    environmentId: params.environmentId,
    agentMcpServerId: enablement._id,
    subscriberId: params.subscriberMongoId,
  });

  if (!connection) {
    return null;
  }

  return {
    connection,
    trusted: isToolTrusted(connection.toolTrust, params.toolName),
  };
}
