import { PinoLogger } from '@novu/application-generic';
import { McpConnectionStatusEnum } from '@novu/shared';

import { EnsureProviderManagedVaultCommand } from '../../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.command';
import { EnsureProviderManagedVault } from '../../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.usecase';
import { GenerateMcpOAuthUrlCommand } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.command';
import { GenerateMcpOAuthUrl } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { isProviderManagedOAuthMcp, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupCard, type SetupCardRow } from './setup-card.helpers';

const PROVIDER_MANAGED_CONNECT_LABEL = 'Connect from provider';

export async function buildSetupCardForMcps(params: {
  mcps: OAuthMcp[];
  resolved?: boolean;
  showProcessingHint?: boolean;
  /**
   * `agentMcpServerId`s that should be re-authorized even if their DB row is
   * already `connected` (e.g. Thalamus reported `MCP server '<name>' initialize
   * failed`). Other connected MCPs still render as a checkmark.
   */
  forceReconnectAgentMcpServerIds?: ReadonlySet<string>;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  subscriberId: string;
  conversationId: string;
  generateMcpOAuthUrl: GenerateMcpOAuthUrl;
  ensureProviderManagedVault: EnsureProviderManagedVault;
  logger: PinoLogger;
}): Promise<Record<string, unknown>> {
  const rows: SetupCardRow[] = [];

  for (const mcp of params.mcps) {
    const needsReconnect = params.forceReconnectAgentMcpServerIds?.has(mcp.agentMcpServerId) ?? false;
    const skipConnectUrl = !needsReconnect && (params.resolved || mcp.status === McpConnectionStatusEnum.Connected);

    if (skipConnectUrl) {
      rows.push(mcp);

      continue;
    }

    if (isProviderManagedOAuthMcp(mcp)) {
      try {
        const result = await params.ensureProviderManagedVault.executeForSetupCard(
          EnsureProviderManagedVaultCommand.create({
            userId: 'system',
            environmentId: params.environmentId,
            organizationId: params.organizationId,
            agentIdentifier: params.agentIdentifier,
            mcpId: mcp.mcpId,
            subscriberId: params.subscriberId,
            conversationId: params.conversationId,
          })
        );

        rows.push({
          ...mcp,
          authorizeUrl: result.vaultUrl,
          connectButtonLabel: PROVIDER_MANAGED_CONNECT_LABEL,
        });
      } catch (err) {
        params.logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            mcpId: mcp.mcpId,
            conversationId: params.conversationId,
          },
          'EnsureProviderManagedVault failed while building managed-agent setup card'
        );

        throw err;
      }

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

  return buildSetupCard({
    mcps: rows,
    resolved: params.resolved,
    showProcessingHint: params.showProcessingHint,
  });
}
