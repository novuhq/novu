import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, PinoLogger, resolveAgentRuntime } from '@novu/application-generic';
import { AgentMcpServerRepository, AgentRepository, IntegrationRepository, McpConnectionRepository } from '@novu/dal';

import { trackAgentMcpServerDisabled } from '../../../shared/analytics/agent-analytics';
import { AgentMcpDefinitionService } from '../../runtime/agent-mcp-definition.service';
import { DisableAgentMcpServerCommand } from './disable-agent-mcp-server.command';

/**
 * Disable a catalog MCP on an agent.
 *
 * Ordering is chosen so a failure in the runtime-projection step never leaves
 * Mongo in a "disabled" state while the provider still has the MCP attached:
 *
 *   1. Best-effort revoke each stored provider-vault credential for runtimes
 *      that expose one (`capabilities.tokenVault === true`). Done first so we
 *      can still read `mcp_connection.auth.vaultCredentialId` from rows that
 *      we are about to delete; vault errors are logged and ignored because
 *      leaving a stale token upstream is preferable to aborting disable.
 *   2. Soft-disable the enablement row by flipping `enabled: false` +
 *      `status: 'syncing'`. The row is intentionally kept so a failed sync
 *      can be retried without losing the enablement record.
 *   3. Update Anthropic's shared agent MCP list. The soft-disabled row is
 *      excluded (`enabledOnly: true`), so it drops off the shared agent.
 *   4. Only after that succeeds: cascade-delete connections and the
 *      enablement row. If step 3 throws, the disabled row + its connections
 *      are left in place — a retry of this same endpoint will pick up where
 *      we left off (revoke is best-effort, soft-disable is idempotent, and
 *      re-running step 3 is safe).
 */
@Injectable()
export class DisableAgentMcpServer {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentMcpDefinitionService: AgentMcpDefinitionService,
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
      ['_id', 'runtime', 'managedRuntime']
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

    await this.revokeVaultCredentials({
      command,
      agent,
      agentMcpServerId: enablement._id,
    });

    // Soft-disable first so the runtime projection drops this MCP without
    // permanently removing the enablement row. Idempotent: a retry that
    // re-enters this path after a failed sync sees `enabled: false` already
    // and the update is a no-op.
    await this.agentMcpServerRepository.update(
      {
        _id: enablement._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { $set: { enabled: false, status: 'syncing' }, $unset: { lastError: 1 } }
    );

    try {
      await this.agentMcpDefinitionService.reconcile({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
      });
    } catch (err) {
      // This row is already soft-disabled and excluded from the push above.
      // Mark error so the dashboard shows a failed disable and retry is safe.
      const code = err instanceof Error ? err.name || 'sync_error' : 'sync_error';
      const message = err instanceof Error ? err.message : 'Unknown provider error';
      await this.agentMcpServerRepository.update(
        {
          _id: enablement._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { status: 'error', lastError: { code, message, at: new Date() } } }
      );

      throw err;
    }

    // Sync succeeded → provider no longer has this MCP attached, so it is
    // safe to drop the local connection rows and the enablement record.
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

    trackAgentMcpServerDisabled(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.agentIdentifier,
      mcpId: command.mcpId,
    });
  }

  /**
   * Best-effort revoke of provider-vault credentials before the cascade
   * delete drops them from Mongo. Skips runtimes whose `tokenVault`
   * capability is `false` (in which case Novu was the sole credential
   * store and there's nothing upstream to clean up). Errors are logged but
   * never block the local cleanup — leaving stale tokens in the runtime
   * vault is preferable to leaving an enablement row half-deleted.
   */
  private async revokeVaultCredentials(args: {
    command: DisableAgentMcpServerCommand;
    agent: { runtime?: string; managedRuntime?: { providerId: string; _integrationId: string } };
    agentMcpServerId: string;
  }): Promise<void> {
    const { command, agent, agentMcpServerId } = args;

    if (agent.runtime !== 'managed' || !agent.managedRuntime) {
      return;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: agent.managedRuntime._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['credentials']
    );

    if (!integration?.credentials) {
      return;
    }

    const resolved = resolveAgentRuntime(agent.managedRuntime.providerId, integration.credentials);

    if (!resolved) {
      return;
    }

    const runtimeProvider = resolved.provider;
    const creds = resolved.credentials;

    if (!runtimeProvider.capabilities.tokenVault) {
      return;
    }

    const connections = await this.mcpConnectionRepository.findByAgentMcpServer({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentMcpServerId,
    });

    for (const connection of connections) {
      const vaultCredentialId = connection.auth?.vaultCredentialId;
      const externalVaultId = connection.auth?.externalVaultId;

      if (!vaultCredentialId || !externalVaultId) {
        continue;
      }

      try {
        await runtimeProvider.deleteVaultCredential({
          integrationCredentials: creds as Record<string, unknown>,
          externalVaultId,
          vaultCredentialId,
        });
      } catch (err) {
        this.logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            connectionId: connection._id,
            vaultCredentialId,
          },
          'Best-effort vault credential deletion failed on disable'
        );
      }
    }
  }
}
