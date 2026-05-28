import type { AgentMcpServerEntity, McpConnectionEntity, McpToolTrust } from '@novu/dal';
import { MCP_SERVERS } from '@novu/shared';

export type ToolTrustPersistScope = 'tool' | 'server';

export function isToolTrusted(trust: McpToolTrust | undefined, toolName: string): boolean {
  if (!trust) {
    return false;
  }

  if (trust.tools?.[toolName] === 'always_allow') {
    return true;
  }

  if (trust.serverDefault === 'always_allow') {
    return true;
  }

  return false;
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

export function extractToolNameFromApprovalValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const fromIndex = trimmed.indexOf(' from ');

  if (fromIndex === -1) {
    const colonIndex = trimmed.indexOf(':');

    return colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex).trim();
  }

  return trimmed.slice(0, fromIndex).trim();
}

export function extractMcpServerNameFromApprovalValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const fromIndex = value.indexOf(' from ');
  if (fromIndex === -1) {
    return undefined;
  }

  const rest = value.slice(fromIndex + ' from '.length);
  const colonIndex = rest.indexOf(':');

  return colonIndex === -1 ? rest.trim() : rest.slice(0, colonIndex).trim();
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
