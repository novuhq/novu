import { PinoLogger } from '@novu/application-generic';
import { McpConnectionStatusEnum } from '@novu/shared';

import { GenerateMcpOAuthUrlCommand } from '../generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import type { OAuthMcp } from './oauth-mcp.types';
import { buildSetupCard, type SetupCardRow } from './setup-card.helpers';

export async function buildSetupCardForMcps(params: {
  mcps: OAuthMcp[];
  resolved?: boolean;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  subscriberId: string;
  conversationId: string;
  generateMcpOAuthUrl: GenerateMcpOAuthUrl;
  logger: PinoLogger;
}): Promise<Record<string, unknown>> {
  const rows: SetupCardRow[] = [];

  for (const mcp of params.mcps) {
    if (params.resolved || mcp.status === McpConnectionStatusEnum.Connected) {
      rows.push(mcp);

      continue;
    }

    try {
      const result = await params.generateMcpOAuthUrl.executeForSetupCard(
        GenerateMcpOAuthUrlCommand.create({
          userId: 'system',
          environmentId: params.environmentId,
          organizationId: params.organizationId,
          agentIdentifier: params.agentIdentifier,
          mcpId: mcp.mcpId,
          subscriberId: params.subscriberId,
          conversationId: params.conversationId,
        })
      );

      rows.push({ ...mcp, authorizeUrl: result.authorizeUrl });
    } catch (err) {
      params.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          mcpId: mcp.mcpId,
          conversationId: params.conversationId,
        },
        'GenerateMcpOAuthUrl failed while building managed-agent setup card'
      );

      rows.push(mcp);
    }
  }

  return buildSetupCard({ mcps: rows, resolved: params.resolved });
}
