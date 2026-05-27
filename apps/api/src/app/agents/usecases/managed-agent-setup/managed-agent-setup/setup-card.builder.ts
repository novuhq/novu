import { PinoLogger } from '@novu/application-generic';

import { GenerateMcpOAuthUrlCommand } from '../../generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../../generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import type { PendingOAuthMcp } from '../list-pending-oauth-mcps/list-pending-oauth-mcps.usecase';
import { buildSetupCard } from './setup-card.helpers';

export async function buildConnectActionsForPendingMcps(params: {
  pendingMcps: PendingOAuthMcp[];
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  subscriberId: string;
  conversationId: string;
  generateMcpOAuthUrl: GenerateMcpOAuthUrl;
  logger: PinoLogger;
}): Promise<{ name: string; authorizeUrl: string }[]> {
  const actions: { name: string; authorizeUrl: string }[] = [];

  for (const pendingMcp of params.pendingMcps) {
    try {
      const result = await params.generateMcpOAuthUrl.execute(
        GenerateMcpOAuthUrlCommand.create({
          userId: 'system',
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          agentIdentifier: params.agentIdentifier,
          mcpId: pendingMcp.mcpId,
          subscriberId: params.subscriberId,
          conversationId: params.conversationId,
        })
      );

      actions.push({
        name: pendingMcp.name,
        authorizeUrl: result.authorizeUrl,
      });
    } catch (err) {
      params.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          mcpId: pendingMcp.mcpId,
          conversationId: params.conversationId,
        },
        'GenerateMcpOAuthUrl failed while building managed-agent setup card'
      );
    }
  }

  return actions;
}

export async function buildSetupCardForPendingMcps(params: {
  pendingMcps: PendingOAuthMcp[];
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  subscriberId: string;
  conversationId: string;
  generateMcpOAuthUrl: GenerateMcpOAuthUrl;
  logger: PinoLogger;
}): Promise<Record<string, unknown>> {
  const connectActions = await buildConnectActionsForPendingMcps(params);

  return buildSetupCard({ connectActions });
}
